'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, History, Loader2, Plus } from 'lucide-react'
import { api, ApiError } from '@/lib/api/client'
import type { TaskAuditLog } from '@/lib/api/mappers'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface TaskAuditLogPanelProps {
  taskId: string
  actorId: string
  canRecord?: boolean
  defaultOpen?: boolean
}

const ACTION_LABELS: Record<string, string> = {
  TASK_ATTACHMENT_CONFIRMED: 'Attachment added',
  status_changed: 'Status changed',
  assigned: 'Assignee changed',
}

function formatAuditDetail(
  action: string,
  oldValue?: string,
  newValue?: string,
): string | null {
  const tryParse = (raw?: string): Record<string, unknown> | null => {
    if (!raw?.trim()) return null
    try {
      const parsed = JSON.parse(raw) as unknown
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null
    } catch {
      return null
    }
  }

  if (action === 'TASK_ATTACHMENT_CONFIRMED') {
    const data = tryParse(newValue)
    const name =
      typeof data?.key === 'string'
        ? data.key.split('/').pop()
        : typeof data?.attachmentId === 'string'
          ? 'file'
          : null
    return name ? `Added ${name}` : 'File attached'
  }

  const oldParsed = tryParse(oldValue)
  const newParsed = tryParse(newValue)
  if (oldParsed || newParsed) {
    const keys = [
      ...new Set([
        ...Object.keys(oldParsed ?? {}),
        ...Object.keys(newParsed ?? {}),
      ]),
    ].filter((k) => !k.toLowerCase().includes('id'))
    if (keys.length === 1) {
      const k = keys[0]
      const from = oldParsed?.[k]
      const to = newParsed?.[k]
      if (from != null || to != null) {
        return `${String(from ?? '—')} → ${String(to ?? '—')}`
      }
    }
    return null
  }

  if (oldValue && newValue) return `${oldValue} → ${newValue}`
  if (newValue && newValue.length <= 80) return newValue
  if (oldValue && oldValue.length <= 80) return oldValue
  return null
}

function actionLabel(action: string): string {
  return (
    ACTION_LABELS[action] ??
    action
      .replace(/^TASK_/, '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase())
  )
}

export function TaskAuditLogPanel({
  taskId,
  actorId,
  canRecord = false,
  defaultOpen = false,
}: TaskAuditLogPanelProps) {
  const [logs, setLogs] = useState<TaskAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(defaultOpen)
  const [showForm, setShowForm] = useState(false)
  const [action, setAction] = useState('status_changed')
  const [oldValue, setOldValue] = useState('')
  const [newValue, setNewValue] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await api.listAuditLogsForTask(taskId)
      setLogs(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load audit log')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!action.trim()) return
    setSaving(true)
    try {
      await api.createAuditLog(taskId, {
        action: action.trim(),
        actorId,
        oldValue: oldValue.trim() || undefined,
        newValue: newValue.trim() || undefined,
      })
      toast.success('Audit entry recorded')
      setShowForm(false)
      setOldValue('')
      setNewValue('')
      await load()
      setOpen(true)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not record audit entry',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-t border-border/60 pt-4">
      <div className="flex items-center justify-between gap-2">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="w-4 h-4" />
            Activity history
            {!loading && (
              <span className="text-xs font-normal">({logs.length})</span>
            )}
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform',
                open && 'rotate-180',
              )}
            />
          </button>
        </CollapsibleTrigger>
        {canRecord && open && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus className="w-3 h-3" />
            Record
          </Button>
        )}
      </div>

      <CollapsibleContent className="pt-3 space-y-3">
        {showForm && canRecord && (
          <form
            onSubmit={(e) => void handleAdd(e)}
            className="rounded-lg border border-border p-3 space-y-2 bg-muted/20"
          >
            <div className="space-y-1">
              <Label htmlFor="audit-action" className="text-xs">
                Action
              </Label>
              <Input
                id="audit-action"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="status_changed"
                className="h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="audit-old" className="text-xs">
                  Old value
                </Label>
                <Input
                  id="audit-old"
                  value={oldValue}
                  onChange={(e) => setOldValue(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="audit-new" className="text-xs">
                  New value
                </Label>
                <Input
                  id="audit-new"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <Button type="submit" size="sm" disabled={saving} className="gap-1">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Save entry
            </Button>
          </form>
        )}

        {loading ? (
          <Skeleton className="h-12 w-full" />
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No activity recorded yet.
          </p>
        ) : (
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {logs.map((log) => {
              const detail = formatAuditDetail(
                log.action,
                log.oldValue,
                log.newValue,
              )
              return (
                <li
                  key={log.id}
                  className="flex items-start justify-between gap-3 text-sm py-1.5 border-b border-border/40 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {actionLabel(log.action)}
                    </p>
                    {detail && (
                      <p className="text-muted-foreground text-xs mt-0.5 truncate">
                        {detail}
                      </p>
                    )}
                    {log.actorName && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.actorName}
                      </p>
                    )}
                  </div>
                  <time className="text-xs text-muted-foreground shrink-0 tabular-nums">
                    {new Date(log.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                </li>
              )
            })}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
