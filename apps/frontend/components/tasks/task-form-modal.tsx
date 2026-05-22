'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Project, Task, TaskPriority, TaskStatus, User } from '@/lib/types'
import { api, ApiError } from '@/lib/api/client'
import { mapApiTaskToTask } from '@/lib/api/mappers'
import { buildUserMap } from '@/lib/api/client'
import type { TaskAttachment } from '@/lib/types'
import {
  FileUploadDropzone,
  patchStagedUploads,
  type StagedUpload,
} from '@/components/upload/file-upload-dropzone'
import { uploadTaskAttachments } from '@/lib/upload/task-attachments'
import { TaskAttachmentsPanel } from '@/components/tasks/task-attachments-panel'

interface TaskFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects: Project[]
  users: User[]
  teamId: string
  task?: Task | null
  onSaved: () => void
  onTaskCreated?: (task: Task) => void
}

export function TaskFormModal({
  open,
  onOpenChange,
  projects,
  users,
  teamId,
  task,
  onSaved,
  onTaskCreated,
}: TaskFormModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [dueDate, setDueDate] = useState('')
  const [uploads, setUploads] = useState<StagedUpload[]>([])
  const [editAttachments, setEditAttachments] = useState<TaskAttachment[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [teamProjects, setTeamProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)

  // NEW (from HEAD): project-based assignees
  const [assignableUsers, setAssignableUsers] = useState<User[]>([])
  const [assigneesLoading, setAssigneesLoading] = useState(false)

  const isEdit = !!task

  const usersInTeam = users.filter((u) => u.teamId === teamId)

  const availableProjects =
    teamProjects.length > 0
      ? teamProjects
      : projects.filter((p) => p.teamId === teamId)

  useEffect(() => {
    if (!open || !teamId) {
      setTeamProjects([])
      return
    }
    setProjectsLoading(true)
    void api
      .listProjects(teamId)
      .then(setTeamProjects)
      .catch(() => setTeamProjects([]))
      .finally(() => setProjectsLoading(false))
  }, [open, teamId])

  // ✅ KEEP (HEAD): load employees for selected project
  useEffect(() => {
    if (!open || !projectId) {
      setAssignableUsers([])
      return
    }

    setAssigneesLoading(true)

    void api
      .getProject(projectId, true)
      .then((project) => {
        const employees = (project.members ?? []).filter(
          (u) => u.role === 'employee',
        )
        setAssignableUsers(employees)
      })
      .catch(() => setAssignableUsers([]))
      .finally(() => setAssigneesLoading(false))
  }, [open, projectId])

  // original form init effect
  useEffect(() => {
    if (!open) return

    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setProjectId(task.projectId)
      setAssigneeId(task.assigneeId ?? '')
      setPriority(task.priority)
      setStatus(task.status)
      setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '')
    } else {
      setTitle('')
      setDescription('')
      setProjectId('')
      const firstInTeam = users.filter((u) => u.teamId === teamId)[0]
      setAssigneeId(firstInTeam?.id ?? '')
      setPriority('medium')
      setStatus('todo')
      setDueDate(new Date().toISOString().slice(0, 10))
    }

    setUploads([])

    if (task) {
      setEditAttachments(task.attachments ?? [])
      void api
        .getTask(task.id)
        .then((raw) => {
          const mapped = mapApiTaskToTask(raw, buildUserMap(users), 0)
          setEditAttachments(mapped.attachments ?? [])
        })
        .catch(() => {})
    } else {
      setEditAttachments([])
    }
  }, [open, task, projects, users])

  useEffect(() => {
    if (!open || availableProjects.length === 0) return
    const valid = availableProjects.some((p) => p.id === projectId)
    if (!valid) {
      setProjectId(availableProjects[0]?.id ?? '')
    }
  }, [open, availableProjects, projectId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Title is required')
      return
    }

    if (!projectId) {
      toast.error('Select a project')
      return
    }

    if (!assigneeId) {
      toast.error('Select an assignee')
      return
    }

    // ✅ FIXED: project-based validation (merged logic)
    if (!assignableUsers.some((u) => u.id === assigneeId)) {
      toast.error('Assignee must be an employee assigned to this project')
      return
    }

    if (!dueDate) {
      toast.error('Due date is required')
      return
    }

    setSubmitting(true)

    try {
      if (task) {
        await api.patchTask(task.id, {
          title,
          description,
          priority,
          dueDate,
          assigneeId,
          status,
        })
        toast.success('Task updated')
      } else {
        const created = await api.createTask({
          title,
          description,
          priority,
          dueDate,
          assigneeId,
          teamId,
          projectId,
          status,
        })

        toast.success('Task created')

        try {
          const fullTask = await api.getTaskWithMeta(created.taskId)
          onTaskCreated?.(fullTask)
        } catch {
          onTaskCreated?.(
            mapApiTaskToTask(created, buildUserMap(users), 0),
          )
        }
      }

      onSaved()
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit task' : 'Create task'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Project</Label>
            <Select
              value={projectId || undefined}
              onValueChange={setProjectId}
              disabled={projectsLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    projectsLoading
                      ? 'Loading projects…'
                      : 'Select a project'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assignee</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !projectId
                      ? 'Select a project first'
                      : assigneesLoading
                        ? 'Loading employees…'
                        : assignableUsers.length === 0
                          ? 'No employees in this project'
                          : 'Select assignee'
                  }
                />
              </SelectTrigger>

              <SelectContent>
                {(assignableUsers.length > 0
                  ? assignableUsers
                  : usersInTeam
                ).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}