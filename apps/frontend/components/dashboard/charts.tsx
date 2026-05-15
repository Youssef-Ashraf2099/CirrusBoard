'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie } from 'recharts'

const weeklyData = [
  { name: 'Mon', tasks: 12, completed: 8 },
  { name: 'Tue', tasks: 18, completed: 14 },
  { name: 'Wed', tasks: 15, completed: 12 },
  { name: 'Thu', tasks: 22, completed: 18 },
  { name: 'Fri', tasks: 16, completed: 15 },
  { name: 'Sat', tasks: 8, completed: 6 },
  { name: 'Sun', tasks: 5, completed: 4 },
]

const statusData = [
  { name: 'Todo', value: 3, color: '#3b82f6' },
  { name: 'In Progress', value: 4, color: '#f59e0b' },
  { name: 'Review', value: 2, color: '#a855f7' },
  { name: 'Done', value: 2, color: '#22c55e' },
]

const projectProgressData = [
  { name: 'TaskFlow 2.0', progress: 68 },
  { name: 'Mobile App', progress: 42 },
  { name: 'Brand Refresh', progress: 85 },
  { name: 'API Suite', progress: 25 },
]

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm text-muted-foreground">
            {entry.name}: <span className="font-medium text-foreground">{entry.value}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function TasksChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Weekly Task Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="taskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.75 0.15 195)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="oklch(0.75 0.15 195)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.7 0.18 145)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="oklch(0.7 0.18 145)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.01 250)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="oklch(0.65 0 0)" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="oklch(0.65 0 0)" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="tasks"
                  stroke="oklch(0.75 0.15 195)"
                  strokeWidth={2}
                  fill="url(#taskGradient)"
                  name="Total Tasks"
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="oklch(0.7 0.18 145)"
                  strokeWidth={2}
                  fill="url(#completedGradient)"
                  name="Completed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function StatusDistribution() {
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
          <div className="h-[280px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={1000}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {statusData.map((status) => (
              <div key={status.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                <span className="text-sm text-muted-foreground">{status.name}</span>
                <span className="text-sm font-medium text-foreground ml-auto">{status.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function ProjectProgress() {
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
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectProgressData} layout="vertical">
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="oklch(0.75 0.15 195)" />
                    <stop offset="100%" stopColor="oklch(0.7 0.18 280)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.01 250)" horizontal={false} />
                <XAxis 
                  type="number" 
                  stroke="oklch(0.65 0 0)" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="oklch(0.65 0 0)" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="progress" 
                  fill="url(#barGradient)" 
                  radius={[0, 4, 4, 0]}
                  animationDuration={1000}
                  name="Progress %"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
