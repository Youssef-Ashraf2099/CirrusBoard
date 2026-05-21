'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Bell, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api, ApiError } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import type { Notification } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function NotificationsMenu() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  const unread = items.filter((n) => !n.read).length

  const load = useCallback(async () => {
    if (!user?.id) {
      setItems([])
      return
    }
    setLoading(true)
    try {
      const rows = await api.listNotifications(user.id)
      setItems(rows)
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : 'Could not load notifications',
      )
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  async function removeNotification(n: Notification, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    try {
      await api.deleteNotification(n.id)
      setItems((prev) => prev.filter((x) => x.id !== n.id))
    } catch {
      toast.error('Could not delete notification')
    }
  }

  async function markRead(n: Notification) {
    if (n.read) return
    try {
      const updated = await api.patchNotification(n.id, true)
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? updated : x)),
      )
    } catch {
      /* ignore */
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center"
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!user?.id ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Sign in to see notifications.
          </p>
        ) : loading && items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            {items.slice(0, 12).map((n) => {
              const href = n.link
                ? n.link.startsWith('/')
                  ? n.link
                  : `/${n.link}`
                : undefined
              return (
                <DropdownMenuItem
                  key={n.id}
                  className="flex flex-col items-start gap-1 py-2 cursor-pointer relative pr-8"
                  onSelect={() => void markRead(n)}
                  asChild={!!href}
                >
                  {href ? (
                    <Link href={href} className="w-full">
                      <NotificationRow n={n} />
                    </Link>
                  ) : (
                    <NotificationRow n={n} />
                  )}
                  <button
                    type="button"
                    className="absolute right-2 top-2 p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                    aria-label="Delete notification"
                    onClick={(e) => void removeNotification(n, e)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </DropdownMenuItem>
              )
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NotificationRow({ n }: { n: Notification }) {
  return (
    <>
      <span
        className={cn(
          'text-sm font-medium w-full',
          !n.read && 'text-foreground',
          n.read && 'text-muted-foreground',
        )}
      >
        {n.title}
      </span>
      <span className="text-xs text-muted-foreground line-clamp-2">
        {n.message}
      </span>
      <span className="text-[10px] text-muted-foreground">
        {formatRelativeTime(n.createdAt)}
      </span>
    </>
  )
}
