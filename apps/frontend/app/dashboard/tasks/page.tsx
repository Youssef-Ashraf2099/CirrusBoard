"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { TaskFormModal } from "@/components/tasks/task-form-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  MoreHorizontal,
  Calendar,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  Circle,
  Timer,
  AlertCircle,
} from "lucide-react";
import type {
  Task,
  TaskStatus,
  TaskPriority,
  Project,
  User,
} from "@/lib/types";
import { api, ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { isPrivilegedRole } from "@/lib/roles";
import { ALL_TEAMS_VALUE, resolveTaskListTeamId } from "@/lib/task-list-scope";

const statusConfig: Record<
  TaskStatus,
  { label: string; icon: React.ReactNode; color: string }
> = {
  todo: {
    label: "To Do",
    icon: <Circle className="w-4 h-4" />,
    color: "text-blue-500",
  },
  in_progress: {
    label: "In Progress",
    icon: <Timer className="w-4 h-4" />,
    color: "text-amber-500",
  },
  review: {
    label: "In Review",
    icon: <AlertCircle className="w-4 h-4" />,
    color: "text-purple-500",
  },
  done: {
    label: "Done",
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-green-500",
  },
};

const priorityColors: Record<TaskPriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-500/10 text-blue-500",
  high: "bg-amber-500/10 text-amber-500",
  urgent: "bg-destructive/10 text-destructive",
};

export default function TasksPage() {
  const { teamId, user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [viewTeamId, setViewTeamId] = useState(ALL_TEAMS_VALUE);
  const [teamOptions, setTeamOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const canViewAllTeams = isPrivilegedRole(user?.role);
  const canManage = canViewAllTeams;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const scopeTeam = resolveTaskListTeamId(
        canViewAllTeams,
        viewTeamId,
        teamId,
      );
      const projectsPromise = scopeTeam
        ? api.listProjects(scopeTeam)
        : canViewAllTeams
          ? api
              .listTeams()
              .then((teams) =>
                Promise.all(
                  teams.map((t) => api.listProjects(t.id).catch(() => [])),
                ),
              )
              .then((groups) => groups.flat())
          : Promise.resolve([]);
      const [p, tRaw, mu] = await Promise.all([
        projectsPromise,
        api.loadTasksWithMeta(scopeTeam),
        scopeTeam ? api.listUsers(scopeTeam) : api.listUsers(),
      ]);
      setProjects(p);
      setTasks(tRaw);
      setMembers(mu);
      if (canViewAllTeams) {
        const teams = await api.listTeams().catch(() => []);
        setTeamOptions(teams.map((t) => ({ id: t.id, name: t.name })));
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not load tasks";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [teamId, viewTeamId, canViewAllTeams]);

  useEffect(() => {
    if (!canViewAllTeams) setViewTeamId(teamId);
    else setViewTeamId(ALL_TEAMS_VALUE);
  }, [teamId, canViewAllTeams]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || task.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getProjectName = (projectId: string) => {
    return projects.find((p) => p.id === projectId)?.name ?? "Unknown";
  };

  const toggleDone = async (task: Task, nextDone: boolean) => {
    const nextStatus: TaskStatus = nextDone ? "done" : "todo";
    const prev = tasks;
    setTasks((ts) =>
      ts.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
    );
    try {
      await api.patchTaskStatus(task.id, nextStatus);
      toast.success("Task updated");
    } catch {
      setTasks(prev);
      toast.error("Could not update status");
    }
  };

  async function deleteTask(task: Task) {
    try {
      await api.deleteTask(task.id);
      setTasks((t) => t.filter((x) => x.id !== task.id));
      toast.success("Task deleted");
      if (selectedTask?.id === task.id) setModalOpen(false);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not delete";
      toast.error(msg);
    }
  }

  const usersResolved = members;

  const openTaskDetail = useCallback(async (task: Task) => {
    try {
      const full = await api.getTaskWithMeta(task.id);
      setSelectedTask(full);
      setModalOpen(true);
    } catch {
      setSelectedTask(task);
      setModalOpen(true);
    }
  }, []);

  const syncSelectedTask = useCallback(async () => {
    if (!selectedTask?.id || !modalOpen) return;
    try {
      const full = await api.getTaskWithMeta(selectedTask.id);
      setSelectedTask(full);
      setTasks((prev) => prev.map((t) => (t.id === full.id ? full : t)));
    } catch {
      /* keep current selection */
    }
  }, [selectedTask?.id, modalOpen]);

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
            <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
            <p className="text-muted-foreground">
              Live data from the CirrusBoard API
              {canViewAllTeams
                ? viewTeamId === ALL_TEAMS_VALUE
                  ? " · all teams"
                  : ` · team ${viewTeamId}`
                : ` (${teamId})`}
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
                  {teamOptions.length > 0 ? (
                    teamOptions.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value={teamId}>{teamId}</SelectItem>
                  )}
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            {canManage && (
              <Button
                className="gap-2"
                onClick={() => {
                  setTaskToEdit(null);
                  setTaskFormOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                New Task
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))
            : Object.entries(statusConfig).map(([status, config]) => {
                const count = tasks.filter((t) => t.status === status).length;
                return (
                  <motion.div key={status} layout>
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "p-2 rounded-lg bg-muted/50",
                              config.color,
                            )}
                          >
                            {config.icon}
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">
                              {count}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {config.label}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-14 px-6">
                <CheckCircle2 className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-40" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No tasks yet
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {tasks.length === 0
                    ? "Create your first task or invite teammates once users exist in the backend."
                    : "Nothing matches these filters."}
                </p>
                {canManage && (
                  <Button
                    className="gap-2"
                    onClick={() => {
                      setTaskToEdit(null);
                      setTaskFormOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Create Task
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filteredTasks.map((task, index) => {
                  const status = statusConfig[task.status];
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: Math.min(index * 0.04, 0.4),
                      }}
                      onClick={() => void openTaskDetail(task)}
                      className="p-5 sm:p-6 hover:bg-muted/30 cursor-pointer transition-colors group min-h-[88px]"
                    >
                      <div className="flex items-start gap-5">
                        <Checkbox
                          checked={task.status === "done"}
                          className="mt-1"
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={(v) =>
                            void toggleDone(task, v === true)
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1">
                              <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                                {task.title}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                                {task.description || "No description"}
                              </p>
                            </div>
                            {canManage && (
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  asChild
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTaskToEdit(task);
                                      setTaskFormOpen(true);
                                    }}
                                  >
                                    Edit Task
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void deleteTask(task);
                                    }}
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <Badge
                              variant="outline"
                              className={cn("gap-1", status.color)}
                            >
                              {status.icon}
                              {status.label}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(priorityColors[task.priority])}
                            >
                              {task.priority}
                            </Badge>
                            <span className="text-muted-foreground">
                              {getProjectName(task.projectId)}
                            </span>
                            {task.dueDate && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {new Date(task.dueDate).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}
                              </div>
                            )}
                            {task.commentsCount > 0 && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <MessageSquare className="w-3 h-3" />
                                {task.commentsCount}
                              </div>
                            )}
                            {task.attachmentsCount > 0 && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Paperclip className="w-3 h-3" />
                                {task.attachmentsCount}
                              </div>
                            )}
                            {task.assignee && (
                              <div className="ml-auto">
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={task.assignee.avatar} />
                                  <AvatarFallback className="text-xs">
                                    {task.assignee.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <TaskDetailModal
        task={selectedTask}
        projects={projects}
        currentUser={user}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCommentsChanged={() => {
          void reload();
          void syncSelectedTask();
        }}
        onTaskUpdated={() => {
          void reload();
          void syncSelectedTask();
        }}
      />

      {canManage && (
        <TaskFormModal
          open={taskFormOpen}
          onOpenChange={setTaskFormOpen}
          projects={projects}
          users={usersResolved}
          teamId={teamId}
          task={taskToEdit}
          onSaved={() => void reload()}
          onTaskCreated={(created) => {
            void reload();
            setSelectedTask(created);
            setModalOpen(true);
          }}
        />
      )}
    </>
  );
}
