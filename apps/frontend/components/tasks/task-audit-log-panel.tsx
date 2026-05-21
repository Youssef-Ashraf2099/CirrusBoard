'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { History, Loader2, Plus } from 'lucide-react'
import { api, ApiError } from '@/lib/api/client'
import type { TaskAuditLog } from '@/lib/api/mappers'
import { toast } from 'sonner'

interface TaskAuditLogPanelProps {
  taskId: string
  actorId: string
  canRecord?: boolean
}

export function TaskAuditLogPanel({
  taskId,
  actorId,
  canRecord = false,
}: TaskAuditLogPanelProps) {
  const [logs, setLogs] = useState<TaskAuditLog[]>([])
  const [loading, setLoading] = useState(true)
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
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not record audit entry',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <History className="w-3 h-3" />
          Audit log ({logs.length})
        </span>
        {canRecord && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus className="w-3 h-3" />
            Record
          </Button>
        )}
      </div>

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
        <Skeleton className="h-16 w-full" />
      ) : logs.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No audit entries yet. Status changes may be logged automatically by the API.
        </p>
      ) : (
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {logs.map((log) => (
            <li
              key={log.id}
              className="text-xs rounded-md border border-border/60 px-2 py-1.5"
            >
              <p className="font-medium text-foreground">
                {log.action}
                {log.actorName ? (
                  <span className="text-muted-foreground font-normal">
                    {' '}
                    · {log.actorName}
                  </span>
                ) : null}
              </p>
              {(log.oldValue || log.newValue) && (
                <p className="text-muted-foreground mt-0.5">
                  {log.oldValue ?? '—'} → {log.newValue ?? '—'}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(log.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
