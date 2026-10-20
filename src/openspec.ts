import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { Change, Group } from './types'

/**
 * Parses the tasks.md of one change: `##` headings become task groups and
 * `- [ ]` / `- [x]` lines become tasks. Groups without tracked tasks
 * (notes, follow-ups) are dropped.
 */
export function parseTasks(name: string, text: string): Change {
  const groups: Group[] = []
  for (const line of text.split('\n')) {
    const heading = line.match(/^##\s+(.+)$/)?.[1]
    if (heading !== undefined) {
      groups.push({ title: heading.trim(), tasks: [] })
      continue
    }
    const task = line.match(/^\s*- \[([ xX])\]\s+(.+)$/)
    const current = groups.at(-1)
    if (task && current) {
      current.tasks.push({ label: (task[2] ?? '').replace(/`/g, ''), isDone: task[1] !== ' ' })
    }
  }
  const tracked = groups.filter(group => group.tasks.length > 0)
  const all = tracked.flatMap(group => group.tasks)
  return { name, done: all.filter(task => task.isDone).length, total: all.length, groups: tracked }
}

/**
 * Reads openspec/changes/<change>/tasks.md of every active change.
 *
 * From the project root, not the working directory, so the pane does not
 * empty when a session moves into a module or a frontend.
 */
export async function loadChanges(root: string): Promise<Change[]> {
  const dir = join(root, 'openspec', 'changes')
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  }
  catch {
    return []
  }
  const found: Change[] = []
  // readdir order is filesystem-dependent; sort so the pane is stable.
  for (const entry of entries.toSorted((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory() || entry.name === 'archive') {
      continue
    }
    let text = ''
    try {
      text = await readFile(join(dir, entry.name, 'tasks.md'), 'utf8')
    }
    catch {
      found.push({ name: entry.name, done: 0, total: 0, groups: [] })
      continue
    }
    found.push(parseTasks(entry.name, text))
  }
  return found
}
