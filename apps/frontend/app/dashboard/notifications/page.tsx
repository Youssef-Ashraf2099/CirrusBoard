'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell, Trash2, Plus, Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api/client'
import { logApi, logApiError } from '@/lib/debug-api'
import type { Notification, User } from '@/lib/types'
import { toast } from 'sonner'
import { isPrivilegedRole } from '@/lib/roles'
import { cn } from '@/lib/utils'

const NOTIFICATION_TYPES = [
  { value: 'TASK_ASSIGNED', label: 'Task assigned' },
  { value: 'COMMENT_ADDED', label: 'Comment added' },
  { value: 'TASK_COMPLETED', label: 'Task completed' },
  { value: 'MENTION', label: 'Mention' },
  { value: 'DEADLINE', label: 'Deadline' },
] as const

export default function NotificationsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Notification[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const canBroadcast = isPrivilegedRole(user?.role)

  const [form, setForm] = useState({
    userId: '',
    type: 'TASK_ASSIGNED' as (typeof NOTIFICATION_TYPES)[number]['value'],
    title: '',
    message: '',
    link: '',
  })

  const load = useCallback(async () => {
    if (!user?.id) {
      logApi('Notifications', 'NotificationsPage.load skipped — no user.id')
      return
    }
    logApi('Notifications', 'NotificationsPage.load start', {
      userId: user.id,
      canBroadcast,
    })
    setLoading(true)
    try {
      const [n, u] = await Promise.all([
        api.listNotifications(user.id),
        canBroadcast ? api.listUsers() : Promise.resolve([] as User[]),
      ])
      logApi('Notifications', 'NotificationsPage.load success', {
        notifications: n.length,
        users: u.length,
      })
      setItems(n.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
      setAllUsers(u)
    } catch (e) {
      logApiError('Notifications', 'NotificationsPage.load', e)
      toast.error(e instanceof ApiError ? e.message : 'Could not load notifications')
    } finally {
      setLoading(false)
    }
  }, [user?.id, canBroadcast])

  useEffect(() => {
    void load()
  }, [load])

  async function handleDelete(id: string) {
    logApi('Notifications', 'NotificationsPage.handleDelete start', { id })
    try {
      await api.deleteNotification(id)
      logApi('Notifications', 'NotificationsPage.handleDelete success')
      setItems((prev) => prev.filter((n) => n.id !== id))
      toast.success('Notification removed')
    } catch (e) {
      logApiError('Notifications', 'NotificationsPage.handleDelete', e)
      toast.error(e instanceof ApiError ? e.message : 'Delete failed')
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const targetId = canBroadcast ? form.userId : user?.id
    if (!targetId) {
      logApi('Notifications', 'NotificationsPage.handleCreate skipped — no targetId')
      return
    }
    setCreating(true)
    const payload = {
      userId: targetId,
      type: form.type,
      title: form.title,
      message: form.message,
      link: form.link || undefined,
    }
    logApi('Notifications', 'NotificationsPage.handleCreate start', payload)
    try {
      await api.createNotification(payload)
      logApi('Notifications', 'NotificationsPage.handleCreate success')
      toast.success('Notification created')
      setForm((f) => ({ ...f, title: '', message: '', link: '' }))
      await load()
    } catch (err) {
      logApiError('Notifications', 'NotificationsPage.handleCreate', err)
      toast.error(err instanceof ApiError ? err.message : 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-7 h-7 text-primary" />
          Notifications
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          In-app notifications from DynamoDB. Managers can notify any user; employees can
          create entries for themselves only.
        </p>
      </div>

      {canBroadcast && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Send notification
            </CardTitle>
            <CardDescription>Uses POST /api/notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleCreate(e)} className="space-y-3 max-w-lg">
              <div className="space-y-1">
                <Label>Recipient</Label>
                <Select
                  value={form.userId}
                  onValueChange={(v) => setForm((f) => ({ ...f, userId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      type: v as typeof form.type,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Message</Label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Link (optional)</Label>
                <Input
                  value={form.link}
                  onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                  placeholder="/dashboard/tasks"
                />
              </div>
              <Button type="submit" disabled={creating} className="gap-2">
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Send
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your inbox</CardTitle>
          <CardDescription>
            {items.filter((n) => !n.read).length} unread
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No notifications yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    'flex items-start justify-between gap-3 rounded-lg border px-3 py-2',
                    !n.read && 'border-primary/30 bg-primary/5',
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{n.title}</p>
                      {!n.read && (
                        <Badge variant="secondary" className="text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive"
                    onClick={() => void handleDelete(n.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
