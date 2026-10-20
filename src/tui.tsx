import { Plugin, usePlugin } from '@opencode/plugin/tui'
import { createTextAttributes, type RGBA } from '@opentui/core'
import { createSignal, For, Show } from 'solid-js'

import { loadChanges } from './openspec'
import type { Change } from './types'

const PANEL = 'openspec.pane'
const BOLD = createTextAttributes({ bold: true })

/**
 * One line of the pane, cut with an ellipsis at the width the pane really
 * has. That width is measured, not the one the host reports, which can be
 * wider; and the line never wraps, since a wrapped line spills over the
 * next one.
 */
function Line(props: { width: number; fg?: RGBA; attributes?: number; children: string }) {
  const text = () =>
    props.width > 0 && props.children.length > props.width
      ? `${props.children.slice(0, Math.max(0, props.width - 1))}…`
      : props.children

  return (
    <text fg={props.fg} attributes={props.attributes} wrapMode="none" flexShrink={0}>
      {text()}
    </text>
  )
}

/** One change of openspec/changes: its name, its progress, and its task groups. */
function ChangeView(props: { change: Change; width: number }) {
  const context = usePlugin()
  const complete = () => props.change.done === props.change.total && props.change.total > 0

  return (
    <box flexDirection="column" flexShrink={0} marginBottom={1}>
      <Line
        width={props.width}
        fg={complete() ? context.theme.text.feedback.success.base : undefined}
        attributes={BOLD}
      >
        {`${props.change.name} ${props.change.done}/${props.change.total}`}
      </Line>
      <For each={props.change.groups}>
        {(group, index) => (
          // A blank line between groups; the first one stays under the change name.
          <box flexDirection="column" flexShrink={0} marginTop={index() > 0 ? 1 : 0}>
            <Line width={props.width} fg={context.theme.text.faint}>{group.title}</Line>
            <For each={group.tasks}>
              {task => (
                <Line
                  width={props.width}
                  fg={task.isDone ? context.theme.text.faint : context.theme.text.feedback.warning.base}
                >
                  {`${task.isDone ? ' ☑ ' : ' ☐ '}${task.label}`}
                </Line>
              )}
            </For>
          </box>
        )}
      </For>
    </box>
  )
}

/**
 * The pane content: every active change, or a note when there is none.
 * Inside a scrollbox, so a long list scrolls instead of being squeezed:
 * rows must keep their height (flexShrink 0), or they overlap.
 */
function Pane(props: { changes: () => Change[] }) {
  const context = usePlugin()
  const [width, setWidth] = createSignal(0)

  return (
    <scrollbox flexGrow={1} scrollY>
      <box
        flexDirection="column"
        flexShrink={0}
        onSizeChange={function (this: { width: number }) {
          setWidth(this.width)
        }}
      >
        <Show
          when={props.changes().length > 0}
          fallback={<Line width={width()} fg={context.theme.text.faint}>No active OpenSpec changes.</Line>}
        >
          <For each={props.changes()}>{change => <ChangeView change={change} width={width()} />}</For>
        </Show>
      </box>
    </scrollbox>
  )
}

export default Plugin.define({
  id: 'openspec-pane',
  async setup(context) {
    const [state, setState] = context.storage.memory('state', { initial: { changes: [] as Change[] } })
    const root = () => (context.location ?? context.data.location.default()).directory

    // Whether the pane was opened by itself for the current run of active
    // changes. It resets when they all go away, so the pane opens again when
    // new ones appear, but it does not reopen after the user closes it.
    let opened = false

    // Opens the pane when there is work to follow and it was not opened yet.
    // open() returns false outside a session (usually at startup), so it is
    // tried again on the next refresh or session select.
    function autoOpen(): void {
      if (opened || state.changes.length === 0) {
        return
      }
      opened = context.ui.panel.open(PANEL)
    }

    async function refresh(): Promise<void> {
      const changes = await loadChanges(root())
      setState(draft => {
        draft.changes = changes
      })
      if (changes.length === 0) {
        opened = false
      }
      autoOpen()
    }

    context.ui.slot({
      append: 'session.panel',
      render: panel => (
        <Show when={panel.name === PANEL}>
          <Pane changes={() => state.changes} />
        </Show>
      ),
    })

    context.keymap.layer(() => ({
      mode: 'global',
      commands: [
        {
          id: 'openspec-pane.open',
          title: 'Show the tasks of the active OpenSpec changes in a side pane',
          group: 'OpenSpec',
          palette: true,
          slash: { name: 'openspec' },
          run: async () => {
            await refresh()
            // Say why when the surface does not draw it: outside a session
            // the panel has nowhere to attach.
            if (!context.ui.panel.open(PANEL)) {
              context.ui.toast.show({
                title: 'OpenSpec',
                message: 'Pane not shown: no session is open.',
                variant: 'warning',
              })
            }
          },
        },
      ],
    }))

    // Refresh as work goes on, like the pane of the Claude Code mod.
    const offIdle = context.data.on('session.idle', () => void refresh())
    const offTool = context.data.on('session.step.ended', () => void refresh())
    const timer = setInterval(() => void refresh(), 20000)

    // The pane does not survive a restart: reopen it at session start when
    // there is work to follow, and as soon as changes appear mid-session.
    await refresh()
    const offSelect = context.data.on('tui.session.select', autoOpen)

    return () => {
      offIdle()
      offTool()
      offSelect()
      clearInterval(timer)
    }
  },
})
