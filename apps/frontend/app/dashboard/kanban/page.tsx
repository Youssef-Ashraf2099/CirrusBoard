'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { TaskDetailModal } from '@/components/tasks/task-detail-modal'
import { TaskFormModal } from '@/components/tasks/task-form-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search } from 'lucide-react'
import type { Task, TaskStatus, Project, User } from '@/lib/types'
import { api, ApiError } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import { isPrivilegedRole } from '@/lib/roles'
import {
  ALL_TEAMS_VALUE,
  resolveTaskListTeamId,
} from '@/lib/task-list-scope'

export default function KanbanPage() {
  const { teamId, user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [viewTeamId, setViewTeamId] = useState(ALL_TEAMS_VALUE)
  const [teamOptions, setTeamOptions] = useState<{ id: string; name: string }[]>([])
  const canViewAllTeams = isPrivilegedRole(user?.role)
  const canManage = canViewAllTeams

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const scopeTeam = resolveTaskListTeamId(
        canViewAllTeams,
        viewTeamId,
        teamId,
      )
      const [p, t, u] = await Promise.all([
        api.listProjects(scopeTeam, { employeeScope: !canViewAllTeams }),
        api.loadTasksWithMeta(scopeTeam, {
          employeeScope: !canViewAllTeams,
        }),
        scopeTeam ? api.listUsers(scopeTeam) : api.listUsers(),
      ])
      setProjects(p)
      setTasks(t)
      setMembers(u)
      if (canViewAllTeams) {
        const teams = await api.listTeams().catch(() => [])
        setTeamOptions(teams.map((tm) => ({ id: tm.id, name: tm.name })))
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load board')
    } finally {
      setLoading(false)
    }
  }, [teamId, viewTeamId, canViewAllTeams])

  useEffect(() => {
    if (!canViewAllTeams) setViewTeamId(teamId)
    else setViewTeamId(ALL_TEAMS_VALUE)
  }, [teamId, canViewAllTeams])

  useEffect(() => {
    void reload()
  }, [reload])

  const persistStatus = async (taskId: string, status: TaskStatus) => {
    try {
      await api.patchTaskStatus(taskId, status)
    } catch {
      toast.error('Could not save column')
      throw new Error('persist failed')
    }
  }

  const openTaskDetail = useCallback(async (task: Task) => {
    try {
      const full = await api.getTaskWithMeta(task.id)
      setSelectedTask(full)
      setModalOpen(true)
    } catch {
      setSelectedTask(task)
      setModalOpen(true)
    }
  }, [])

  const syncSelectedTask = useCallback(async () => {
    if (!selectedTask?.id || !modalOpen) return
    try {
      const full = await api.getTaskWithMeta(selectedTask.id)
      setSelectedTask(full)
      setTasks((prev) => prev.map((t) => (t.id === full.id ? full : t)))
    } catch {
      /* keep current selection */
    }
  }, [selectedTask?.id, modalOpen])

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Kanban Board</h1>
            <p className="text-muted-foreground">
              Drag cards to call `PATCH /tasks/:id/status`
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {canViewAllTeams && (
              <Select value={viewTeamId} onValueChange={setViewTeamId}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_TEAMS_VALUE}>All Teams</SelectItem>
                  {teamOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canManage && (
              <Button
                className="gap-2"
                type="button"
                disabled={
                  canViewAllTeams && viewTeamId === ALL_TEAMS_VALUE
                }
                onClick={() => setTaskFormOpen(true)}
              >
                <Plus className="w-4 h-4" />
                New Task
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((c) => (
              <Skeleton key={c} className="h-[420px] flex-1 min-w-[260px] rounded-xl" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
            <p className="mb-4">No tasks in this view.</p>
            {canManage && (
              <Button
                type="button"
                disabled={
                  canViewAllTeams && viewTeamId === ALL_TEAMS_VALUE
                }
                onClick={() => setTaskFormOpen(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Create task
              </Button>
            )}
          </div>
        ) : (
          <KanbanBoard
            tasks={tasks}
            onTasksChange={setTasks}
            filter={{
              search: searchQuery,
              projectId: selectedProject,
            }}
            onTaskClick={(t) => void openTaskDetail(t)}
            onTaskStatusPersist={persistStatus}
          />
        )}
      </motion.div>

      <TaskDetailModal
        task={selectedTask}
        projects={projects}
        currentUser={user}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCommentsChanged={() => {
          void reload()
          void syncSelectedTask()
        }}
        onTaskUpdated={() => {
          void reload()
          void syncSelectedTask()
        }}
      />

      {canManage && (
        <TaskFormModal
          open={taskFormOpen}
          onOpenChange={setTaskFormOpen}
          projects={projects}
          users={members}
          teamId={
            canViewAllTeams && viewTeamId !== ALL_TEAMS_VALUE
              ? viewTeamId
              : teamId
          }
          onSaved={() => void reload()}
          onTaskCreated={async (created) => {
            await reload()
            setSelectedTask(created)
            setModalOpen(true)
          }}
        />
      )}
    </>
  )
}
