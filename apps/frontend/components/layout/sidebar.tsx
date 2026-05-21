'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Zap,
  BarChart3,
  Menu,
  Shield,
  Building2,
  Bell,
  Activity,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { NotificationsMenu } from '@/components/layout/notifications-menu'

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban },
  { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/dashboard/kanban', label: 'Kanban Board', icon: BarChart3 },
  { href: '/dashboard/team', label: 'Team', icon: Users },
  {
    href: '/dashboard/teams',
    label: 'Teams',
    icon: Building2,
    roles: ['admin', 'manager'] as const,
  },
  {
    href: '/dashboard/activity',
    label: 'Activity',
    icon: Activity,
  },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  {
    href: '/dashboard/users',
    label: 'User management',
    icon: Shield,
    roles: ['admin', 'manager'] as const,
  },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const links = navItems.filter((item) => {
    if ('roles' in item && item.roles) {
      if (!user) return false
      return item.roles.includes(user.role as (typeof item.roles)[number])
    }
    return true
  })

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={cn(
        'fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border',
        'flex flex-col z-50',
      )}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <motion.div
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Zap className="w-6 h-6 text-primary-foreground" />
          </motion.div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="font-bold text-lg text-sidebar-foreground whitespace-nowrap overflow-hidden"
              >
                TaskFlow
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
        {links.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg transition-colors relative',
                  'hover:bg-sidebar-accent group',
                  isActive && 'bg-sidebar-accent text-sidebar-primary',
                )}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-sidebar-primary rounded-r-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0',
                    isActive
                      ? 'text-sidebar-primary'
                      : 'text-sidebar-foreground/70 group-hover:text-sidebar-foreground',
                  )}
                />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        'font-medium whitespace-nowrap',
                        isActive
                          ? 'text-sidebar-primary'
                          : 'text-sidebar-foreground/70 group-hover:text-sidebar-foreground',
                      )}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              type="button"
              className={cn(
                'w-full flex items-center gap-3 p-2 rounded-lg',
                'hover:bg-sidebar-accent transition-colors',
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Avatar className="w-10 h-10 border-2 border-sidebar-primary/30">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback>{user?.name?.charAt(0) ?? '?'}</AvatarFallback>
              </Avatar>
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 text-left overflow-hidden"
                  >
                    <p className="font-medium text-sm text-sidebar-foreground truncate">
                      {user?.name ?? 'Account'}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60 capitalize truncate">
                      {user?.role ?? ''}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                Profile & settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive cursor-pointer"
              onClick={() => logout()}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.aside>
  )
}

interface TopBarProps {
  sidebarCollapsed: boolean
  onMenuClick: () => void
}

export function TopBar({ sidebarCollapsed, onMenuClick }: TopBarProps) {
  const { user } = useAuth()
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  return (
    <motion.header
      initial={false}
      animate={{ marginLeft: sidebarCollapsed ? 80 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed top-0 right-0 left-0 h-16 bg-background/80 backdrop-blur-xl border-b border-border z-40"
    >
      <div className="h-full flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Welcome back, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Here&apos;s what&apos;s happening with your team today
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <NotificationsMenu />

          <Badge variant="outline" className="hidden sm:flex gap-1 items-center capitalize">
            <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
            {user?.role ?? ''}
          </Badge>
        </div>
      </div>
    </motion.header>
  )
}
