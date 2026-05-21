'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from 'recharts'

export type WeeklyChartPoint = { name: string; tasks: number; completed: number }
export type StatusChartPoint = { name: string; value: number; color: string }
export type ProjectProgressPoint = { name: string; progress: number }

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string }>
  label?: string
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm text-muted-foreground">
            {entry.name}:{' '}
            <span className="font-medium text-foreground">{entry.value}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

export function TasksChart({ data }: { data: WeeklyChartPoint[] }) {
  const hasData = data.some((d) => d.tasks > 0 || d.completed > 0)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Weekly Task Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <EmptyChart message="No task activity in the last 7 days" />
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="taskGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.75 0.15 195)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.75 0.15 195)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.7 0.18 145)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.7 0.18 145)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.01 250)" vertical={false} />
                  <XAxis dataKey="name" stroke="oklch(0.65 0 0)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.65 0 0)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="tasks" stroke="oklch(0.75 0.15 195)" strokeWidth={2} fill="url(#taskGradient)" name="Tasks (updated)" />
                  <Area type="monotone" dataKey="completed" stroke="oklch(0.7 0.18 145)" strokeWidth={2} fill="url(#completedGradient)" name="Completed" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function StatusDistribution({ data }: { data: StatusChartPoint[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Task Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <EmptyChart message="No tasks to chart yet" />
          ) : (
            <>
              <div className="h-[280px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {data.map((status) => (
                  <div key={status.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                    <span className="text-sm text-muted-foreground">{status.name}</span>
                    <span className="text-sm font-medium text-foreground ml-auto">{status.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function ProjectProgress({ data }: { data: ProjectProgressPoint[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Project Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <EmptyChart message="No projects to show" />
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical">
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="oklch(0.75 0.15 195)" />
                      <stop offset="100%" stopColor="oklch(0.7 0.18 280)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.01 250)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="oklch(0.65 0 0)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="oklch(0.65 0 0)" fontSize={12} tickLine={false} axisLine={false} width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="progress" fill="url(#barGradient)" radius={[0, 4, 4, 0]} name="Progress %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
