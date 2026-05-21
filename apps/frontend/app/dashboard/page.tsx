'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { StatsGrid, ActivityFeed, ProjectCard, TeamOverview } from '@/components/dashboard/stats-cards'
import { TasksChart, StatusDistribution, ProjectProgress } from '@/components/dashboard/charts'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { ActivityItem, DashboardStats, Project, Task } from '@/lib/types'
import { api, ApiError } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import {
  buildProjectProgressData,
  buildStatusDistributionData,
  buildWeeklyTaskData,
} from '@/lib/dashboard-chart-data'

function computeStats(tasks: Task[], projects: Project[], members: number): DashboardStats {
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === 'done').length
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length
  const overdueTasks = tasks.filter((t) => {
    if (!t.dueDate || t.status === 'done') return false
    return new Date(t.dueDate) < new Date()
  }).length
  const completionRate =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    overdueTasks,
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => p.status === 'active').length,
    teamMembers: members,
    completionRate,
  }
}

export default function DashboardPage() {
  const { teamId } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [memberCount, setMemberCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, t, u, a] = await Promise.all([
        api.listProjects(teamId),
        api.loadTasksWithMeta(teamId),
        api.listUsers(teamId),
        api.listActivity(teamId, 10).catch(() => [] as ActivityItem[]),
      ])
      setProjects(p)
      setTasks(t)
      setMemberCount(u.length)
      setActivity(a)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load dashboard')
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    void load()
  }, [load])

  const stats = computeStats(tasks, projects, memberCount)
  const weeklyData = useMemo(() => buildWeeklyTaskData(tasks), [tasks])
  const statusData = useMemo(() => buildStatusDistributionData(tasks), [tasks])
  const projectProgressData = useMemo(() => buildProjectProgressData(projects), [projects])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Live KPIs derived from Tasks &amp; Projects for team {teamId}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="gap-2" asChild>
            <Link href="/dashboard/tasks">
              <Plus className="w-4 h-4" />
              New Task
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 && tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center space-y-4">
          <p className="text-muted-foreground max-w-md mx-auto">
            No data in DynamoDB for this team yet. Create a user (signup), then add a project and tasks.
          </p>
          <div className="flex justify-center gap-3">
            <Button asChild>
              <Link href="/dashboard/projects">Create project</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/tasks">View tasks</Link>
            </Button>
          </div>
        </div>
      ) : (
        <StatsGrid stats={stats} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TasksChart data={weeklyData} />
        <StatusDistribution data={statusData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Active Projects</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/projects">View all</Link>
            </Button>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects to show.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.slice(0, 4).map((project, index) => (
                <ProjectCard key={project.id} project={project} index={index} />
              ))}
            </div>
          )}
        </div>
        <div className="space-y-6">
          <TeamOverview memberCount={stats.teamMembers} />
          <ActivityFeed activities={activity.slice(0, 5)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectProgress data={projectProgressData} />
      </div>
    </motion.div>
  )
}
