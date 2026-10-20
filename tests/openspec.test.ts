import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, test } from 'node:test'

import { loadChanges, parseTasks } from '../src/openspec.ts'

const TASKS = `# Tasks

## 1. Setup

- [x] 1.1 Create the module
- [ ] 1.2 Add \`fields\`

## Notes

- not a task
`

describe('parseTasks', () => {
  test('counts done and total over the tracked groups only', () => {
    const change = parseTasks('user-library', TASKS)
    assert.deepEqual([change.name, change.done, change.total], ['user-library', 1, 2])
  })

  test('keeps the groups that hold tasks and strips the backticks', () => {
    const change = parseTasks('user-library', TASKS)
    assert.deepEqual(change.groups.map(group => group.title), ['1. Setup'])
    assert.deepEqual(change.groups[0]?.tasks[1], { label: '1.2 Add fields', isDone: false })
  })
})

describe('loadChanges', () => {
  let root: string

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'openspec-pane-'))
    await mkdir(join(root, 'openspec', 'changes', 'archive'), { recursive: true })
    await mkdir(join(root, 'openspec', 'changes', 'user-library'), { recursive: true })
    await mkdir(join(root, 'openspec', 'changes', 'empty'), { recursive: true })
    await writeFile(join(root, 'openspec', 'changes', 'user-library', 'tasks.md'), TASKS)
  })

  after(async () => {
    await rm(root, { recursive: true, force: true })
  })

  test('reads the active changes of the project, past the archive', async () => {
    const changes = await loadChanges(root)
    assert.deepEqual(changes.map(change => [change.name, change.done, change.total]), [
      ['empty', 0, 0],
      ['user-library', 1, 2],
    ])
  })

  test('reports no changes without an openspec folder', async () => {
    const missing = await mkdtemp(join(tmpdir(), 'openspec-pane-empty-'))
    try {
      assert.deepEqual(await loadChanges(missing), [])
    }
    finally {
      await rm(missing, { recursive: true, force: true })
    }
  })
})
