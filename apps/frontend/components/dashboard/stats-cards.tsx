'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  FolderKanban,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import type { DashboardStats, ActivityItem, Project, Task } from '@/lib/types'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  color: 'primary' | 'success' | 'warning' | 'destructive' | 'accent'
  delay?: number
}

const colorClasses = {
  primary: 'from-primary/20 to-primary/5 border-primary/20',
  success: 'from-success/20 to-success/5 border-success/20',
  warning: 'from-warning/20 to-warning/5 border-warning/20',
  destructive: 'from-destructive/20 to-destructive/5 border-destructive/20',
  accent: 'from-accent/20 to-accent/5 border-accent/20',
}

const iconColorClasses = {
  primary: 'text-primary bg-primary/10',
  success: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/10',
  destructive: 'text-destructive bg-destructive/10',
  accent: 'text-accent bg-accent/10',
}

export function StatCard({ title, value, change, icon, color, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className={cn(
        'relative overflow-hidden border bg-gradient-to-br',
        colorClasses[color]
      )}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground font-medium">{title}</p>
              <motion.p
                className="text-3xl font-bold text-foreground"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: delay + 0.2 }}
              >
                {value}
              </motion.p>
              {change !== undefined && (
                <div className="flex items-center gap-1">
                  {change >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-success" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-destructive" />
                  )}
                  <span className={cn(
                    'text-sm font-medium',
                    change >= 0 ? 'text-success' : 'text-destructive'
                  )}>
                    {Math.abs(change)}%
                  </span>
                  <span className="text-xs text-muted-foreground">vs last week</span>
                </div>
              )}
            </div>
            <motion.div
              className={cn('p-3 rounded-xl', iconColorClasses[color])}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              {icon}
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface StatsGridProps {
  stats: DashboardStats
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Tasks"
        value={stats.totalTasks}
        change={12}
        icon={<Target className="w-6 h-6" />}
        color="primary"
        delay={0}
      />
      <StatCard
        title="Completed"
        value={stats.completedTasks}
        change={8}
        icon={<CheckCircle2 className="w-6 h-6" />}
        color="success"
        delay={0.1}
      />
      <StatCard
        title="In Progress"
        value={stats.inProgressTasks}
        change={-3}
        icon={<Clock className="w-6 h-6" />}
        color="warning"
        delay={0.2}
      />
      <StatCard
        title="Overdue"
        value={stats.overdueTasks}
        change={-15}
        icon={<AlertTriangle className="w-6 h-6" />}
        color="destructive"
        delay={0.3}
      />
    </div>
  )
}

interface ActivityFeedProps {
  activities: ActivityItem[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No recent activity for this team yet.
          </p>
        ) : null}
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={activity.user?.avatar} />
              <AvatarFallback>{activity.user?.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium text-foreground">{activity.user?.name}</span>
                {' '}
                <span className="text-muted-foreground">{activity.action}</span>
                {' '}
                <span className="font-medium text-primary">{activity.target}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(activity.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  )
}

interface ProjectCardProps {
  project: Project
  index: number
}

export function ProjectCard({ project, index }: ProjectCardProps) {
  const statusColors = {
    active: 'bg-success/10 text-success border-success/20',
    completed: 'bg-primary/10 text-primary border-primary/20',
    archived: 'bg-muted text-muted-foreground border-muted',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
    >
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all cursor-pointer group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <FolderKanban className="w-5 h-5 text-primary" />
              </motion.div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {project.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Due {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={cn('capitalize', statusColors[project.status])}>
              {project.status}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {project.description}
          </p>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface TeamOverviewProps {
  memberCount: number
}

export function TeamOverview({ memberCount }: TeamOverviewProps) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-primary" />
          Team Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-6">
          <div>
            <motion.p
              className="text-4xl font-bold text-foreground"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              {memberCount}
            </motion.p>
            <p className="text-sm text-muted-foreground">Active members</p>
          </div>
          <motion.div
            className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            <Users className="w-8 h-8 text-primary" />
          </motion.div>
        </div>
      </CardContent>
    </Card>
  )
}
