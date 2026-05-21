import type { Project, Task, TaskStatus } from '@/lib/types'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_CHART: { status: TaskStatus; name: string; color: string }[] = [
  { status: 'todo', name: 'Todo', color: '#3b82f6' },
  { status: 'in_progress', name: 'In Progress', color: '#f59e0b' },
  { status: 'review', name: 'Review', color: '#a855f7' },
  { status: 'done', name: 'Done', color: '#22c55e' },
]

/** Tasks created/updated per weekday (last 7 days window). */
export function buildWeeklyTaskData(tasks: Task[]) {
  const buckets = DAY_LABELS.map((name) => ({
    name,
    tasks: 0,
    completed: 0,
  }))

  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 6)

  for (const task of tasks) {
    const ref = task.updatedAt || task.createdAt
    const d = new Date(ref)
    if (d < weekAgo) continue
    const idx = d.getDay()
    buckets[idx].tasks += 1
    if (task.status === 'done') buckets[idx].completed += 1
  }

  return buckets
}

export function buildStatusDistributionData(tasks: Task[]) {
  return STATUS_CHART.map(({ status, name, color }) => ({
    name,
    value: tasks.filter((t) => t.status === status).length,
    color,
  })).filter((row) => row.value > 0)
}

export function buildProjectProgressData(projects: Project[]) {
  return projects
    .slice()
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 8)
    .map((p) => ({
      name: p.name.length > 18 ? `${p.name.slice(0, 16)}…` : p.name,
      progress: Math.min(100, Math.max(0, p.progress)),
    }))
}
