'use client'

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import type { Task, User } from '@/lib/types'
import { api, ApiError } from '@/lib/api/client'
import { toast } from 'sonner'

interface TaskAssignControlProps {
  task: Task
  users: User[]
  onAssigned: () => void
}

export function TaskAssignControl({
  task,
  users,
  onAssigned,
}: TaskAssignControlProps) {
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? '')
  const [saving, setSaving] = useState(false)

  async function handleAssign() {
    if (!assigneeId) {
      toast.error('Select an assignee')
      return
    }
    setSaving(true)
    try {
      await api.assignTask(task.id, assigneeId)
      toast.success('Task assigned')
      onAssigned()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not assign task')
    } finally {
      setSaving(false)
    }
  }

  const teamUsers = users.filter((u) => u.teamId === task.teamId)

  return (
    <div className="space-y-2">
      <Select value={assigneeId} onValueChange={setAssigneeId}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder="Select assignee" />
        </SelectTrigger>
        <SelectContent>
          {teamUsers.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="w-full"
        disabled={saving || assigneeId === task.assigneeId}
        onClick={() => void handleAssign()}
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
        Assign (manager API)
      </Button>
    </div>
  )
}
