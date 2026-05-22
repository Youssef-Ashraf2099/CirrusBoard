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
  /** After create (and uploads), opens detail view with fresh task from API. */
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

  useEffect(() => {
<<<<<<< HEAD
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

  useEffect(() => {
=======
>>>>>>> parent of b9139aa (selecting assignee only from same team/project)
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

  useEffect(() => {
    if (!open || isEdit) return
    if (assigneeId && !usersInTeam.some((u) => u.id === assigneeId)) {
      setAssigneeId(usersInTeam[0]?.id ?? '')
    }
  }, [open, isEdit, teamId, assigneeId, usersInTeam])

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
<<<<<<< HEAD
    if (!projectTeamId) {
      toast.error('Select a project first')
      return
    }
    if (!assignableUsers.some((u) => u.id === assigneeId)) {
      toast.error('Assignee must be an employee assigned to this project')
=======
    if (!usersInTeam.some((u) => u.id === assigneeId)) {
      toast.error('Assignee must belong to the selected team')
>>>>>>> parent of b9139aa (selecting assignee only from same team/project)
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

        const pendingFiles = uploads
          .filter((u) => u.status === 'staged')
          .map((u) => u.file)

        if (pendingFiles.length > 0) {
          try {
            const stagedItems = uploads.filter((u) => u.status === 'staged')
            for (const item of stagedItems) {
              setUploads((prev) =>
                patchStagedUploads(prev, item.id, {
                  status: 'uploading',
                  progress: 0,
                }),
              )
              const updated = await uploadTaskAttachments(
                created.taskId,
                [item.file],
                (_idx, percent) => {
                  setUploads((prev) =>
                    patchStagedUploads(prev, item.id, {
                      progress: percent,
                      status: 'uploading',
                    }),
                  )
                },
              )
              if (updated?.attachments?.length) {
                setEditAttachments(updated.attachments)
              }
              setUploads((prev) =>
                patchStagedUploads(prev, item.id, {
                  status: 'complete',
                  progress: 100,
                }),
              )
            }
          } catch (uploadErr) {
            const msg =
              uploadErr instanceof ApiError
                ? uploadErr.message
                : 'Task created but file upload failed'
            toast.error(msg)
            try {
              const fullTask = await api.getTaskWithMeta(created.taskId)
              onTaskCreated?.(fullTask)
            } catch {
              onTaskCreated?.(
                mapApiTaskToTask(created, buildUserMap(users), 0),
              )
            }
            onSaved()
            onOpenChange(false)
            return
          }
        }

        toast.success('Task created')
        try {
          const fullTask = await api.getTaskWithMeta(created.taskId)
          onTaskCreated?.(fullTask)
        } catch {
          onTaskCreated?.(
            mapApiTaskToTask(created, buildUserMap(users), editAttachments.length),
          )
        }
      }
      onSaved()
      onOpenChange(false)
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Something went wrong'
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
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details, acceptance criteria…"
              className="min-h-[120px] text-base"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                value={projectId || undefined}
                onValueChange={setProjectId}
                disabled={projectsLoading || availableProjects.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      projectsLoading
                        ? 'Loading projects…'
                        : availableProjects.length === 0
                          ? 'No projects for this team'
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
              {!projectsLoading && availableProjects.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Create a project for this team first, then assign the task.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
<<<<<<< HEAD
                  <SelectValue
                    placeholder={
                      !projectId
                        ? 'Select a project first'
                        : assigneesLoading
                          ? 'Loading team members…'
                          : assignableUsers.length === 0
                            ? 'No employees on this project'
                            : 'Select assignee'
                    }
                  />
=======
                  <SelectValue placeholder="Assignee" />
>>>>>>> parent of b9139aa (selecting assignee only from same team/project)
                </SelectTrigger>
                <SelectContent>
                  {usersInTeam.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No users in this team
                    </SelectItem>
                  ) : (
                    usersInTeam.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
<<<<<<< HEAD
              {projectId &&
                !assigneesLoading &&
                assignableUsers.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Assign employees to this project under Projects → edit
                    project, then create the task.
                  </p>
                )}
=======
>>>>>>> parent of b9139aa (selecting assignee only from same team/project)
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as TaskPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as TaskStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To do</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-due">Due date</Label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Attachments</Label>
            {isEdit && task ? (
              <p className="text-xs text-muted-foreground mb-2">
                Save task fields above, then add files below (uploads go to S3).
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mb-2">
                Files upload to S3 after the task is created.
              </p>
            )}
            {!isEdit ? (
              <FileUploadDropzone value={uploads} onChange={setUploads} />
            ) : (
              task && (
                <TaskAttachmentsPanel
                  taskId={task.id}
                  attachments={editAttachments}
                  onAttachmentsChange={async () => {
                    try {
                      const raw = await api.getTask(task.id)
                      const mapped = mapApiTaskToTask(
                        raw,
                        buildUserMap(users),
                        0,
                      )
                      setEditAttachments(mapped.attachments ?? [])
                    } catch {
                      /* panel already refreshed its list */
                    }
                    onSaved()
                  }}
                />
              )
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
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
