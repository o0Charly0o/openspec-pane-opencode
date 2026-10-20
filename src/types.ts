export type Task = { label: string; isDone: boolean }
export type Group = { title: string; tasks: Task[] }
export type Change = { name: string; done: number; total: number; groups: Group[] }
