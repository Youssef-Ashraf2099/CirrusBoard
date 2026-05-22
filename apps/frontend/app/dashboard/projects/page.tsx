'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ProjectFormModal } from '@/components/projects/project-form-modal'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  Plus,
  Search,
  MoreHorizontal,
  FolderKanban,
  Calendar,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
} from 'lucide-react'
import type { Project, Task, User } from '@/lib/types'
import { api, ApiError } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import { isPrivilegedRole } from '@/lib/roles'

const statusColors = {
  active: 'bg-success/10 text-success border-success/20',
  completed: 'bg-primary/10 text-primary border-primary/20',
  archived: 'bg-muted text-muted-foreground border-muted',
}

function progressForProject(projectId: string, tasks: Task[]) {
  const subset = tasks.filter((t) => t.projectId === projectId)
  if (!subset.length) return 0
  const done = subset.filter((t) => t.status === 'done').length
  return Math.round((done / subset.length) * 100)
}

export default function ProjectsPage() {
  const { teamId, user } = useAuth()
  const canManage = isPrivilegedRole(user?.role)
  const canViewAllTeams = canManage
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [formOpen, setFormOpen] = useState(false)
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [p, t, u] = await Promise.all([
        api.listProjects(teamId),
        api.loadTasksWithMeta(teamId, { employeeScope: !canViewAllTeams }),
        api.listUsers(teamId),
      ])
      setProjects(p)
      setTasks(t)
      setMembers(u)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not load projects'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    void reload()
  }, [reload])

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [projects, searchQuery],
  )

  const getProjectTasks = (projectId: string) =>
    tasks.filter((task) => task.projectId === projectId)

  const getProjectTeam = () => members

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
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground">Backed by Nest `GET /projects/team/:teamId`</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>
            <div className="flex items-center border rounded-lg p-1 bg-muted/50">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            {canManage && (
              <Button
                className="gap-2"
                onClick={() => {
                  setProjectToEdit(null)
                  setFormOpen(true)
                }}
              >
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div
            className={cn(
              'gap-6',
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                : 'flex flex-col gap-6',
            )}
          >
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16 border border-dashed rounded-xl bg-muted/20">
            <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6">
              Bootstrap your workspace by creating a project for team {teamId}.
            </p>
            {canManage && (
              <Button
                className="gap-2"
                onClick={() => {
                  setProjectToEdit(null)
                  setFormOpen(true)
                }}
              >
                <Plus className="w-4 h-4" />
                Create Project
              </Button>
            )}
          </div>
        ) : (
          <div
            className={cn(
              'gap-6',
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                : 'flex flex-col',
            )}
          >
            {filteredProjects.map((project, index) => {
              const projectTasks = getProjectTasks(project.id)
              const team = getProjectTeam()
              const completedTasks = projectTasks.filter((t) => t.status === 'done').length
              const progress =
                progressForProject(project.id, tasks) ||
                project.progress ||
                0

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.06 }}
                  whileHover={{ y: -4 }}
                >
                  <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all h-full">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <motion.div
                            className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center"
                            whileHover={{ scale: 1.1, rotate: 5 }}
                          >
                            <FolderKanban className="w-6 h-6 text-primary" />
                          </motion.div>
                          <div>
                            <h3 className="font-semibold text-foreground">{project.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {projectTasks.length} tasks
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn('capitalize', statusColors[project.status])}
                          >
                            {project.status}
                          </Badge>
                          {canManage && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setProjectToEdit(project)
                                    setFormOpen(true)
                                  }}
                                >
                                  Edit Project
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={async () => {
                                    try {
                                      await api.deleteProject(project.id)
                                      toast.success('Project deleted')
                                      void reload()
                                    } catch (e) {
                                      toast.error(e instanceof ApiError ? e.message : 'Failed')
                                    }
                                  }}
                                >
                                  Delete project
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {project.description || '—'}
                      </p>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium text-foreground">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                          <span className="text-muted-foreground">{completedTasks} completed</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-warning" />
                          <span className="text-muted-foreground">
                            {projectTasks.length - completedTasks} remaining
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-border/50">
                        <div className="flex -space-x-2">
                          {team.slice(0, 4).map((member) => (
                            <Avatar key={member.id} className="w-7 h-7 border-2 border-card">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback className="text-xs">
                                {member.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {team.length > 4 && (
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-card">
                              +{team.length - 4}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {project.endDate
                              ? new Date(project.endDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'No deadline'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      {canManage && (
        <ProjectFormModal
          open={formOpen}
          onOpenChange={setFormOpen}
          teamId={teamId}
          project={projectToEdit}
          onSaved={() => void reload()}
        />
      )}
    </>
  )
}
