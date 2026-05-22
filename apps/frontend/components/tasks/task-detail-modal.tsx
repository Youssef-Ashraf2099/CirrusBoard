'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  Calendar,
  MessageSquare,
  Paperclip,
  Clock,
  User,
  Tag,
  FolderKanban,
  MoreHorizontal,
  Send,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  AlertCircle,
  Timer,
} from 'lucide-react'
import type {
  Comment,
  Project,
  Task,
  TaskStatus,
  TaskPriority,
  User as AppUser,
} from '@/lib/types'
import { TaskAttachmentsPanel } from '@/components/tasks/task-attachments-panel'
import { TaskAuditLogPanel } from '@/components/tasks/task-audit-log-panel'
import { TaskAssignControl } from '@/components/tasks/task-assign-control'
import { isPrivilegedRole } from '@/lib/roles'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api/client'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const statusConfig: Record<
  TaskStatus,
  { label: string; icon: React.ReactNode; color: string }
> = {
  todo: {
    label: 'To Do',
    icon: <Circle className="w-4 h-4" />,
    color: 'text-blue-500',
  },
  in_progress: {
    label: 'In Progress',
    icon: <Timer className="w-4 h-4" />,
    color: 'text-amber-500',
  },
  review: {
    label: 'In Review',
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'text-purple-500',
  },
  done: {
    label: 'Done',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-green-500',
  },
}

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-muted text-muted-foreground' },
  medium: { label: 'Medium', color: 'bg-blue-500/10 text-blue-500' },
  high: { label: 'High', color: 'bg-amber-500/10 text-amber-500' },
  urgent: { label: 'Urgent', color: 'bg-destructive/10 text-destructive' },
}

interface TaskDetailModalProps {
  task: Task | null
  projects: Project[]
  currentUser: AppUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCommentsChanged?: () => void
  onTaskUpdated?: () => void
}

export function TaskDetailModal({
  task,
  projects,
  currentUser,
  open,
  onOpenChange,
  onCommentsChanged,
  onTaskUpdated,
}: TaskDetailModalProps) {
  const [detail, setDetail] = useState<Task | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [teamUsers, setTeamUsers] = useState<AppUser[]>([])

  const canManage = isPrivilegedRole(currentUser?.role)

  const refreshDetail = useCallback(async () => {
    if (!task) return
    setDetailLoading(true)
    try {
      const full = await api.getTaskWithMeta(task.id)
      setDetail(full)
      onTaskUpdated?.()
      return full
    } catch {
      toast.error('Could not refresh task')
      return null
    } finally {
      setDetailLoading(false)
    }
  }, [task?.id, onTaskUpdated])

  useEffect(() => {
    if (!open || !task) {
      setComments([])
      setDetail(null)
      return
    }
    setDetail(task)
    void refreshDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when task id / open changes
    setCommentsLoading(true)
    void api
      .listComments(task.id)
      .then(setComments)
      .catch(() => {
        toast.error('Could not load comments')
      })
      .finally(() => setCommentsLoading(false))

    if (canManage) {
      void api
        .listUsers()
        .then(setTeamUsers)
        .catch(() => setTeamUsers([]))
    }
  }, [open, task?.id, canManage])

  useEffect(() => {
    setEditingId(null)
    setEditDraft('')
  }, [open, task?.id])

  if (!task) {
    return null
  }

  const view = detail ?? task
  const project = projects.find((p) => p.id === view.projectId)
  const status = statusConfig[view.status]
  const priority = priorityConfig[view.priority]

  async function handleSubmitComment() {
    if (!task) return
    if (!newComment.trim() || !currentUser) return
    setSending(true)
    try {
      const created = await api.addComment(task.id, newComment.trim())
      setComments((c) => [...c, created])
      setNewComment('')
      toast.success('Comment added')
      onCommentsChanged?.()
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : 'Failed to send comment'
      toast.error(msg)
    } finally {
      setSending(false)
    }
  }

  async function handleSaveEdit(commentId: string) {
    if (!task || !editDraft.trim()) return
    try {
      const updated = await api.updateComment(
        task.id,
        commentId,
        editDraft.trim(),
      )
      setComments((c) => c.map((x) => (x.id === commentId ? updated : x)))
      setEditingId(null)
      setEditDraft('')
      toast.success('Comment updated')
      onCommentsChanged?.()
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : 'Failed to update comment',
      )
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!task) return
    if (!confirm('Delete this comment?')) return
    try {
      await api.deleteComment(task.id, commentId)
      setComments((c) => c.filter((x) => x.id !== commentId))
      toast.success('Comment deleted')
      if (editingId === commentId) {
        setEditingId(null)
        setEditDraft('')
      }
      onCommentsChanged?.()
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : 'Failed to delete comment',
      )
    }
  }

  const meAvatar = currentUser?.avatar
  const meName = currentUser?.name ?? ''

  const dueLabel = view.dueDate
    ? new Date(view.dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—'
  const createdLabel = new Date(view.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[min(100vw-2rem,48rem)] max-h-[90vh] overflow-hidden flex flex-col gap-0 bg-card border-border p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 space-y-4 border-b border-border/60">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn('gap-1', status.color)}>
              {status.icon}
              {status.label}
            </Badge>
            <Badge variant="outline" className={priority.color}>
              {priority.label}
            </Badge>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-semibold text-foreground leading-tight">
            {view.title}
          </DialogTitle>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                Assignee
              </dt>
              <dd>
                {canManage ? (
                  <TaskAssignControl
                    task={view}
                    onAssigned={() => void refreshDetail()}
                  />
                ) : view.assignee ? (
                  <span className="font-medium">{view.assignee.name}</span>
                ) : (
                  <span className="text-muted-foreground">Unassigned</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <FolderKanban className="w-3.5 h-3.5" />
                Project
              </dt>
              <dd className="font-medium truncate">
                {project?.name ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Due
              </dt>
              <dd className="font-medium">{dueLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Created
              </dt>
              <dd className="font-medium">{createdLabel}</dd>
            </div>
          </dl>

          {view.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
              {view.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-6">
          {view.description?.trim() ? (
            <section>
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                Description
              </h4>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {view.description}
              </p>
            </section>
          ) : null}

          <section>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                Attachments
                {(view.attachments?.length ?? 0) > 0 && (
                  <span className="normal-case">({view.attachments?.length})</span>
                )}
              </h4>
              {detailLoading && (
                <span className="text-xs text-muted-foreground">Updating…</span>
              )}
            </div>
            <TaskAttachmentsPanel
              taskId={view.id}
              attachments={view.attachments ?? []}
              onAttachmentsChange={() => void refreshDetail()}
              compactUpload
            />
          </section>

          <Separator />

          <section>
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Comments ({comments.length})
            </h4>

            {commentsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                    {comments.map((comment) => {
                      const isOwn =
                        currentUser && comment.userId === currentUser.id
                      const isEditing = editingId === comment.id

                      return (
                      <div key={comment.id} className="flex gap-3 group/row">
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarImage src={comment.user?.avatar} />
                          <AvatarFallback>
                            {(comment.user?.name ?? '?').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 bg-muted/50 rounded-lg p-3 min-w-0">
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span className="font-medium text-sm text-foreground">
                              {comment.user?.name}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleDateString(
                                  'en-US',
                                  {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  },
                                )}
                              </span>
                              {isOwn && !isEditing && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 opacity-70 group-hover/row:opacity-100"
                                      type="button"
                                    >
                                      <MoreHorizontal className="w-3.5 h-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setEditingId(comment.id)
                                        setEditDraft(comment.content)
                                      }}
                                    >
                                      <Pencil className="w-4 h-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() =>
                                        void handleDeleteComment(comment.id)
                                      }
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                          {isEditing ? (
                            <div className="space-y-2 mt-2">
                              <Textarea
                                value={editDraft}
                                onChange={(e) => setEditDraft(e.target.value)}
                                className="min-h-[72px]"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  type="button"
                                  onClick={() => void handleSaveEdit(comment.id)}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  type="button"
                                  onClick={() => {
                                    setEditingId(null)
                                    setEditDraft('')
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-foreground/90">
                              {comment.content}
                            </p>
                          )}
                        </div>
                      </div>
                      )
                    })}
                  </div>
            )}

            <div className="flex gap-3">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarImage src={meAvatar} />
                <AvatarFallback>{meName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 relative">
                <Textarea
                  placeholder={
                    currentUser ? 'Add a comment…' : 'Sign in to comment'
                  }
                  value={newComment}
                  disabled={!currentUser || sending}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[72px] pr-12 resize-none text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.metaKey) {
                      void handleSubmitComment()
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="absolute bottom-2 right-2 h-8 w-8"
                  type="button"
                  onClick={() => void handleSubmitComment()}
                  disabled={!currentUser || !newComment.trim() || sending}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </section>

          <TaskAuditLogPanel
            taskId={view.id}
            actorId={currentUser?.id ?? ''}
            canRecord={canManage}
            defaultOpen={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
