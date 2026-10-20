# opencode-openspec-pane

An [OpenCode](https://opencode.ai) plugin: a side pane with the tasks of the active [OpenSpec](https://github.com/Fission-AI/OpenSpec) changes of the current project, refreshed as work goes on. It opens by itself when a session starts inside a project with active changes.

It works in any project that uses OpenSpec: it reads `openspec/changes/*/tasks.md` from the project root, and needs no configuration.

## Install

Add the package to `cli.json` (recommended, so it stays active even when the CLI connects to a remote server):

```json
{
  "plugins": ["opencode-openspec-pane"]
}
```

Or to `opencode.json(c)` of your global or project configuration, where packages are declared as objects:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [{ "package": "opencode-openspec-pane" }]
}
```

To try it from a checkout without publishing, point `cli.json` (in `~/.config/opencode/`) at the `src` directory of the checkout. For a local path OpenCode does not read the `exports` of `package.json`: it looks for a `tui` file inside the directory it is given, so the path must end in `/src`:

```json
{
  "plugins": ["/absolute/path/to/openspec-pane-opencode/src"]
}
```

## Use

- The pane opens on its own when a session starts inside a project with active OpenSpec changes (one or more folders under `openspec/changes/`, other than `archive`), or as soon as the first change appears during a session. Once closed by hand, it stays closed until `/openspec` or until the active changes go away and come back.
- `/openspec` opens or refreshes it by hand (also in the command palette as "Show the tasks of the active OpenSpec changes in a side pane").
- Each change shows its progress (`done/total`) and its task groups, with `☑`/`☐` per task, read from the `- [ ]`/`- [x]` checkboxes of its `tasks.md`.
- It refreshes when a turn ends, as steps complete, and every 20 seconds.

## License

MIT, see [LICENSE](./LICENSE).
