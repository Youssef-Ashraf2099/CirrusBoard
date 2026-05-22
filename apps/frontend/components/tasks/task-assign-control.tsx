'use client'

import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import type { Task, User } from '@/lib/types'
import { api, ApiError } from '@/lib/api/client'
import { toast } from 'sonner'

interface TaskAssignControlProps {
  task: Task
  onAssigned: () => void
}

export function TaskAssignControl({ task, onAssigned }: TaskAssignControlProps) {
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? '')
  const [assignableUsers, setAssignableUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setAssigneeId(task.assigneeId ?? '')
    setLoading(true)
    void api
      .getProject(task.projectId, true)
      .then((project) => {
        setAssignableUsers(
          (project.members ?? []).filter((u) => u.role === 'employee'),
        )
      })
      .catch(() => setAssignableUsers([]))
      .finally(() => setLoading(false))
  }, [task.projectId, task.assigneeId])

  async function onSelectChange(nextId: string) {
    setAssigneeId(nextId)
    if (!nextId || nextId === task.assigneeId) return
    setSaving(true)
    try {
      await api.assignTask(task.id, nextId)
      toast.success('Assignee updated')
      onAssigned()
    } catch (e) {
      setAssigneeId(task.assigneeId ?? '')
      toast.error(e instanceof ApiError ? e.message : 'Could not assign task')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Select
      value={assigneeId}
      onValueChange={(v) => void onSelectChange(v)}
      disabled={saving || loading}
    >
      <SelectTrigger className="h-9 w-full max-w-[220px]">
        {saving || loading ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {loading ? 'Loading…' : 'Saving…'}
          </span>
        ) : (
          <SelectValue placeholder="Unassigned" />
        )}
      </SelectTrigger>
      <SelectContent>
        {assignableUsers.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
