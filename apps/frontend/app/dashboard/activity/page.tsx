'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Activity, Loader2, Plus } from 'lucide-react'
import { api, ApiError } from '@/lib/api/client'
import { logApi, logApiError } from '@/lib/debug-api'
import type { ActivityItem } from '@/lib/types'
import { toast } from 'sonner'
import { isPrivilegedRole } from '@/lib/roles'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function ActivityPage() {
  const { user, teamId } = useAuth()
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [viewTeamId, setViewTeamId] = useState(teamId)
  const canRecord = isPrivilegedRole(user?.role)

  const [form, setForm] = useState({
    action: 'updated',
    target: 'task',
    targetId: '',
  })

  const load = useCallback(async () => {
    logApi('Activity', 'ActivityPage.load start', { viewTeamId, limit: 50 })
    setLoading(true)
    try {
      const rows = await api.listActivity(viewTeamId, 50)
      logApi('Activity', 'ActivityPage.load success', { count: rows.length })
      setItems(rows)
    } catch (e) {
      logApiError('Activity', 'ActivityPage.load', e)
      toast.error(e instanceof ApiError ? e.message : 'Could not load activity')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [viewTeamId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setViewTeamId(teamId)
  }, [teamId])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) {
      logApi('Activity', 'ActivityPage.handleCreate skipped — no user.id')
      return
    }
    setSaving(true)
    const payload = {
      teamId: viewTeamId,
      userId: user.id,
      action: form.action,
      target: form.target,
      targetId: form.targetId,
    }
    logApi('Activity', 'ActivityPage.handleCreate start', payload)
    try {
      await api.createActivity(payload)
      logApi('Activity', 'ActivityPage.handleCreate success')
      toast.success('Activity recorded')
      setForm({ action: 'updated', target: 'task', targetId: '' })
      await load()
    } catch (err) {
      logApiError('Activity', 'ActivityPage.handleCreate', err)
      toast.error(err instanceof ApiError ? err.message : 'Could not record activity')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-7 h-7 text-primary" />
            Activity feed
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Team-scoped activity log (GET /api/activity). Managers can post demo entries.
          </p>
        </div>
        {canRecord && (
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground shrink-0">Team</Label>
            <Input
              className="w-40 font-mono text-sm"
              value={viewTeamId}
              onChange={(e) => setViewTeamId(e.target.value)}
            />
            <Button variant="outline" size="sm" type="button" onClick={() => void load()}>
              Load
            </Button>
          </div>
        )}
      </div>

      {canRecord && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Record activity
            </CardTitle>
            <CardDescription>For seeding demos; production events come from SNS/SQS workers.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => void handleCreate(e)}
              className="grid sm:grid-cols-3 gap-3 max-w-2xl items-end"
            >
              <div className="space-y-1">
                <Label>Action</Label>
                <Input
                  value={form.action}
                  onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Target type</Label>
                <Select
                  value={form.target}
                  onValueChange={(v) => setForm((f) => ({ ...f, target: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">task</SelectItem>
                    <SelectItem value="project">project</SelectItem>
                    <SelectItem value="comment">comment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Target id</Label>
                <Input
                  value={form.targetId}
                  onChange={(e) => setForm((f) => ({ ...f, targetId: e.target.value }))}
                  required
                />
              </div>
              <Button type="submit" disabled={saving} className="gap-2 sm:col-span-3 w-fit">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Post
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
          <CardDescription>Team: {viewTeamId}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No activity for this team.
            </p>
          ) : (
            <ul className="space-y-3">
              {items.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/60"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={a.user?.avatar} />
                    <AvatarFallback>{a.user?.name?.charAt(0) ?? '?'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">{a.user?.name ?? 'Someone'}</span>{' '}
                      <span className="text-muted-foreground">{a.action}</span>{' '}
                      <span className="text-primary">{a.target}</span>{' '}
                      <code className="text-xs">{a.targetId}</code>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
