'use client'

import { useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Calendar,
  MessageSquare,
  Paperclip,
  MoreHorizontal,
  Plus,
  GripVertical,
} from 'lucide-react'
import type { Task, TaskStatus } from '@/lib/types'

const columns: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'todo', title: 'To Do', color: 'bg-blue-500' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-amber-500' },
  { id: 'review', title: 'Review', color: 'bg-purple-500' },
  { id: 'done', title: 'Done', color: 'bg-green-500' },
]

const priorityColors = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  high: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  urgent: 'bg-destructive/10 text-destructive border-destructive/20',
}

interface TaskCardProps {
  task: Task
  index: number
  onClick?: () => void
}

function TaskCard({ task, index, onClick }: TaskCardProps) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <motion.div
          ref={provided.innerRef}
          {...provided.draggableProps}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          onClick={onClick}
          className="mb-3"
        >
          <Card
            className={cn(
              'border-border/50 bg-card/80 backdrop-blur-sm cursor-pointer',
              'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all',
              snapshot.isDragging &&
                'shadow-xl shadow-primary/20 border-primary/50 rotate-2',
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div
                  {...provided.dragHandleProps}
                  className="mt-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  <GripVertical className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-sm text-foreground leading-tight">
                      {task.title}
                    </h4>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                      <MoreHorizontal className="w-3 h-3" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge
                      variant="outline"
                      className={cn('text-xs', priorityColors[task.priority])}
                    >
                      {task.priority}
                    </Badge>
                    {task.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      {task.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(task.dueDate).toLocaleDateString(
                              'en-US',
                              { month: 'short', day: 'numeric' },
                            )}
                          </span>
                        </div>
                      )}
                      {task.commentsCount > 0 && (
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          <span>{task.commentsCount}</span>
                        </div>
                      )}
                      {task.attachmentsCount > 0 && (
                        <div className="flex items-center gap-1">
                          <Paperclip className="w-3 h-3" />
                          <span>{task.attachmentsCount}</span>
                        </div>
                      )}
                    </div>
                    {task.assignee && (
                      <Avatar className="w-6 h-6 border border-border">
                        <AvatarImage src={task.assignee.avatar} />
                        <AvatarFallback className="text-xs">
                          {task.assignee.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </Draggable>
  )
}

interface KanbanColumnProps {
  column: { id: TaskStatus; title: string; color: string }
  tasks: Task[]
  onTaskClick?: (task: Task) => void
}

function KanbanColumn({
  column,
  tasks,
  onTaskClick,
}: KanbanColumnProps) {
  return (
    <div className="flex-1 min-w-[280px] max-w-[350px]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('w-3 h-3 rounded-full', column.color)} />
          <h3 className="font-semibold text-foreground">{column.title}</h3>
          <Badge variant="secondary" className="ml-1">
            {tasks.length}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'min-h-[200px] p-3 rounded-xl transition-colors',
              'bg-muted/30 border border-border/50',
              snapshot.isDraggingOver && 'bg-primary/5 border-primary/30',
            )}
          >
            <AnimatePresence>
              {tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onClick={() => onTaskClick?.(task)}
                />
              ))}
            </AnimatePresence>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}

interface KanbanBoardProps {
  tasks: Task[]
  onTasksChange: (tasks: Task[]) => void
  onTaskClick?: (task: Task) => void
  onTaskStatusPersist?: (
    taskId: string,
    status: TaskStatus,
  ) => Promise<void>
  filter?: { search: string; projectId: string }
}

export function KanbanBoard({
  tasks,
  onTasksChange,
  onTaskClick,
  onTaskStatusPersist,
  filter,
}: KanbanBoardProps) {
  const visibleTasks = useMemo(() => {
    let v = tasks
    if (filter?.search) {
      const q = filter.search.toLowerCase()
      v = v.filter((t) => t.title.toLowerCase().includes(q))
    }
    if (filter?.projectId && filter.projectId !== 'all') {
      v = v.filter((t) => t.projectId === filter.projectId)
    }
    return v
  }, [tasks, filter?.search, filter?.projectId])

  const onDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, draggableId } = result

      if (!destination) return

      const newStatus = destination.droppableId as TaskStatus
      const prev = tasks.find((t) => t.id === draggableId)
      if (!prev || prev.status === newStatus) return
      const snapshot = tasks.map((t) =>
        t.id === draggableId ? { ...t, status: newStatus } : t,
      )
      onTasksChange(snapshot)

      void onTaskStatusPersist?.(draggableId, newStatus)?.catch(() => {
        onTasksChange(tasks)
      })
    },
    [tasks, onTasksChange, onTaskStatusPersist],
  )

  const getTasksByStatus = useCallback(
    (status: TaskStatus) =>
      visibleTasks.filter((task) => task.status === status),
    [visibleTasks],
  )

  const noMatches =
    visibleTasks.length === 0 && tasks.length > 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {noMatches ? (
        <div className="rounded-xl border border-dashed py-14 text-center text-muted-foreground">
          No tasks match your filters. Try clearing search or switching projects.
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={getTasksByStatus(column.id)}
                onTaskClick={onTaskClick}
              />
            ))}
          </div>
        </DragDropContext>
      )}
    </motion.div>
  )
}
