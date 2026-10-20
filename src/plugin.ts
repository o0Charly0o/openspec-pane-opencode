import { Plugin } from '@opencode/plugin'

/**
 * Server-side entry of the package. Everything the pane needs happens in
 * the terminal, so the TUI entry (./tui) does the work; this entry only
 * makes the package loadable from opencode.json as well as cli.json.
 */
export default Plugin.define({
  id: 'openspec-pane',
  setup() {},
})
