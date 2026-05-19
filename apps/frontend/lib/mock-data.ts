import type { User, Team, Project, Task, Comment, DashboardStats, Notification, ActivityItem } from './types'

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'Alex Chen',
    email: 'alex.chen@taskflow.io',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    role: 'admin',
    teamId: 'team-1',
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'user-2',
    name: 'Sarah Johnson',
    email: 'sarah.j@taskflow.io',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    role: 'manager',
    teamId: 'team-1',
    createdAt: '2024-01-20T09:00:00Z'
  },
  {
    id: 'user-3',
    name: 'Mike Rivera',
    email: 'mike.r@taskflow.io',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
    role: 'employee',
    teamId: 'team-1',
    createdAt: '2024-02-01T14:00:00Z'
  },
  {
    id: 'user-4',
    name: 'Emma Wilson',
    email: 'emma.w@taskflow.io',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
    role: 'employee',
    teamId: 'team-1',
    createdAt: '2024-02-10T11:00:00Z'
  },
  {
    id: 'user-5',
    name: 'David Park',
    email: 'david.p@taskflow.io',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    role: 'employee',
    teamId: 'team-2',
    createdAt: '2024-02-15T16:00:00Z'
  },
  {
    id: 'user-6',
    name: 'Lisa Thompson',
    email: 'lisa.t@taskflow.io',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa',
    role: 'manager',
    teamId: 'team-2',
    createdAt: '2024-02-18T08:00:00Z'
  }
]

// Mock Teams
export const mockTeams: Team[] = [
  {
    id: 'team-1',
    name: 'Product Development',
    description: 'Core product development team',
    members: mockUsers.filter(u => u.teamId === 'team-1'),
    managerId: 'user-2',
    createdAt: '2024-01-10T10:00:00Z'
  },
  {
    id: 'team-2',
    name: 'Design Studio',
    description: 'UI/UX and brand design team',
    members: mockUsers.filter(u => u.teamId === 'team-2'),
    managerId: 'user-6',
    createdAt: '2024-01-12T10:00:00Z'
  }
]

// Mock Projects
export const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'TaskFlow 2.0 Launch',
    description: 'Complete redesign and feature overhaul for TaskFlow platform',
    teamId: 'team-1',
    status: 'active',
    progress: 68,
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    createdAt: '2024-01-01T10:00:00Z'
  },
  {
    id: 'proj-2',
    name: 'Mobile App Development',
    description: 'Native iOS and Android applications',
    teamId: 'team-1',
    status: 'active',
    progress: 42,
    startDate: '2024-02-15',
    endDate: '2024-08-15',
    createdAt: '2024-02-15T10:00:00Z'
  },
  {
    id: 'proj-3',
    name: 'Brand Refresh',
    description: 'Updated brand guidelines and visual identity',
    teamId: 'team-2',
    status: 'active',
    progress: 85,
    startDate: '2024-03-01',
    endDate: '2024-05-31',
    createdAt: '2024-03-01T10:00:00Z'
  },
  {
    id: 'proj-4',
    name: 'API Integration Suite',
    description: 'Third-party integrations and API improvements',
    teamId: 'team-1',
    status: 'active',
    progress: 25,
    startDate: '2024-04-01',
    endDate: '2024-09-30',
    createdAt: '2024-04-01T10:00:00Z'
  }
]

// Mock Tasks
export const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Design new dashboard layout',
    description: 'Create wireframes and high-fidelity mockups for the new dashboard',
    status: 'done',
    priority: 'high',
    projectId: 'proj-1',
    assigneeId: 'user-4',
    assignee: mockUsers.find(u => u.id === 'user-4'),
    teamId: 'team-1',
    dueDate: '2024-05-10',
    tags: ['design', 'ui'],
    commentsCount: 8,
    attachmentsCount: 3,
    createdAt: '2024-04-01T10:00:00Z',
    updatedAt: '2024-05-08T15:30:00Z'
  },
  {
    id: 'task-2',
    title: 'Implement authentication flow',
    description: 'Build secure login, signup, and password reset functionality',
    status: 'in_progress',
    priority: 'urgent',
    projectId: 'proj-1',
    assigneeId: 'user-3',
    assignee: mockUsers.find(u => u.id === 'user-3'),
    teamId: 'team-1',
    dueDate: '2024-05-15',
    tags: ['backend', 'security'],
    commentsCount: 12,
    attachmentsCount: 2,
    createdAt: '2024-04-05T09:00:00Z',
    updatedAt: '2024-05-12T11:00:00Z'
  },
  {
    id: 'task-3',
    title: 'API endpoint documentation',
    description: 'Document all REST API endpoints with examples',
    status: 'review',
    priority: 'medium',
    projectId: 'proj-4',
    assigneeId: 'user-3',
    assignee: mockUsers.find(u => u.id === 'user-3'),
    teamId: 'team-1',
    dueDate: '2024-05-20',
    tags: ['documentation', 'api'],
    commentsCount: 5,
    attachmentsCount: 1,
    createdAt: '2024-04-10T14:00:00Z',
    updatedAt: '2024-05-10T16:00:00Z'
  },
  {
    id: 'task-4',
    title: 'Mobile app wireframes',
    description: 'Create wireframes for all mobile app screens',
    status: 'todo',
    priority: 'high',
    projectId: 'proj-2',
    assigneeId: 'user-4',
    assignee: mockUsers.find(u => u.id === 'user-4'),
    teamId: 'team-1',
    dueDate: '2024-05-25',
    tags: ['mobile', 'design'],
    commentsCount: 3,
    attachmentsCount: 0,
    createdAt: '2024-04-15T10:00:00Z',
    updatedAt: '2024-04-15T10:00:00Z'
  },
  {
    id: 'task-5',
    title: 'Database optimization',
    description: 'Improve query performance and add indexing',
    status: 'in_progress',
    priority: 'medium',
    projectId: 'proj-1',
    assigneeId: 'user-3',
    assignee: mockUsers.find(u => u.id === 'user-3'),
    teamId: 'team-1',
    dueDate: '2024-05-18',
    tags: ['backend', 'performance'],
    commentsCount: 7,
    attachmentsCount: 2,
    createdAt: '2024-04-20T11:00:00Z',
    updatedAt: '2024-05-11T09:00:00Z'
  },
  {
    id: 'task-6',
    title: 'User onboarding flow',
    description: 'Design and implement user onboarding experience',
    status: 'todo',
    priority: 'medium',
    projectId: 'proj-1',
    assigneeId: 'user-4',
    assignee: mockUsers.find(u => u.id === 'user-4'),
    teamId: 'team-1',
    dueDate: '2024-05-30',
    tags: ['ux', 'onboarding'],
    commentsCount: 2,
    attachmentsCount: 1,
    createdAt: '2024-04-25T13:00:00Z',
    updatedAt: '2024-04-25T13:00:00Z'
  },
  {
    id: 'task-7',
    title: 'Brand color palette update',
    description: 'Refresh primary and secondary brand colors',
    status: 'done',
    priority: 'high',
    projectId: 'proj-3',
    assigneeId: 'user-5',
    assignee: mockUsers.find(u => u.id === 'user-5'),
    teamId: 'team-2',
    dueDate: '2024-05-05',
    tags: ['branding', 'design'],
    commentsCount: 15,
    attachmentsCount: 5,
    createdAt: '2024-03-15T10:00:00Z',
    updatedAt: '2024-05-04T17:00:00Z'
  },
  {
    id: 'task-8',
    title: 'Set up CI/CD pipeline',
    description: 'Configure automated testing and deployment',
    status: 'review',
    priority: 'urgent',
    projectId: 'proj-1',
    assigneeId: 'user-3',
    assignee: mockUsers.find(u => u.id === 'user-3'),
    teamId: 'team-1',
    dueDate: '2024-05-14',
    tags: ['devops', 'automation'],
    commentsCount: 9,
    attachmentsCount: 3,
    createdAt: '2024-04-28T08:00:00Z',
    updatedAt: '2024-05-13T14:00:00Z'
  },
  {
    id: 'task-9',
    title: 'Notification system',
    description: 'Build real-time notification infrastructure',
    status: 'todo',
    priority: 'low',
    projectId: 'proj-1',
    assigneeId: undefined,
    teamId: 'team-1',
    dueDate: '2024-06-15',
    tags: ['backend', 'realtime'],
    commentsCount: 1,
    attachmentsCount: 0,
    createdAt: '2024-05-01T10:00:00Z',
    updatedAt: '2024-05-01T10:00:00Z'
  },
  {
    id: 'task-10',
    title: 'Performance monitoring setup',
    description: 'Integrate APM tools and set up dashboards',
    status: 'in_progress',
    priority: 'medium',
    projectId: 'proj-4',
    assigneeId: 'user-3',
    assignee: mockUsers.find(u => u.id === 'user-3'),
    teamId: 'team-1',
    dueDate: '2024-05-22',
    tags: ['monitoring', 'devops'],
    commentsCount: 4,
    attachmentsCount: 1,
    createdAt: '2024-05-05T09:00:00Z',
    updatedAt: '2024-05-12T10:00:00Z'
  }
]

// Mock Comments
export const mockComments: Comment[] = [
  {
    id: 'comment-1',
    taskId: 'task-2',
    userId: 'user-2',
    user: mockUsers.find(u => u.id === 'user-2'),
    content: 'Great progress on this! Can we add 2FA support as well?',
    createdAt: '2024-05-10T14:30:00Z',
    updatedAt: '2024-05-10T14:30:00Z'
  },
  {
    id: 'comment-2',
    taskId: 'task-2',
    userId: 'user-3',
    user: mockUsers.find(u => u.id === 'user-3'),
    content: 'Yes, I\'ll include 2FA in the implementation. Should be ready by EOD tomorrow.',
    createdAt: '2024-05-10T15:00:00Z',
    updatedAt: '2024-05-10T15:00:00Z'
  },
  {
    id: 'comment-3',
    taskId: 'task-1',
    userId: 'user-2',
    user: mockUsers.find(u => u.id === 'user-2'),
    content: 'The mockups look amazing! Approved for development.',
    createdAt: '2024-05-08T11:00:00Z',
    updatedAt: '2024-05-08T11:00:00Z'
  }
]

// Mock Dashboard Stats
export const mockDashboardStats: DashboardStats = {
  totalTasks: 10,
  completedTasks: 2,
  inProgressTasks: 4,
  overdueTasks: 1,
  totalProjects: 4,
  activeProjects: 4,
  teamMembers: 6,
  completionRate: 20
}

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    userId: 'user-2',
    type: 'task_completed',
    title: 'Task Completed',
    message: 'Emma completed "Design new dashboard layout"',
    read: false,
    link: '/tasks/task-1',
    createdAt: '2024-05-08T15:30:00Z'
  },
  {
    id: 'notif-2',
    userId: 'user-2',
    type: 'comment_added',
    title: 'New Comment',
    message: 'Mike commented on "Implement authentication flow"',
    read: false,
    link: '/tasks/task-2',
    createdAt: '2024-05-10T15:00:00Z'
  },
  {
    id: 'notif-3',
    userId: 'user-2',
    type: 'deadline',
    title: 'Deadline Approaching',
    message: '"Set up CI/CD pipeline" is due tomorrow',
    read: true,
    link: '/tasks/task-8',
    createdAt: '2024-05-13T09:00:00Z'
  },
  {
    id: 'notif-4',
    userId: 'user-2',
    type: 'task_assigned',
    title: 'Task Assigned',
    message: 'You assigned "Mobile app wireframes" to Emma',
    read: true,
    link: '/tasks/task-4',
    createdAt: '2024-04-15T10:00:00Z'
  }
]

// Mock Activity
export const mockActivity: ActivityItem[] = [
  {
    id: 'activity-1',
    userId: 'user-4',
    user: mockUsers.find(u => u.id === 'user-4'),
    action: 'completed',
    target: 'Design new dashboard layout',
    targetId: 'task-1',
    createdAt: '2024-05-08T15:30:00Z'
  },
  {
    id: 'activity-2',
    userId: 'user-3',
    user: mockUsers.find(u => u.id === 'user-3'),
    action: 'moved to review',
    target: 'Set up CI/CD pipeline',
    targetId: 'task-8',
    createdAt: '2024-05-13T14:00:00Z'
  },
  {
    id: 'activity-3',
    userId: 'user-2',
    user: mockUsers.find(u => u.id === 'user-2'),
    action: 'commented on',
    target: 'Implement authentication flow',
    targetId: 'task-2',
    createdAt: '2024-05-10T14:30:00Z'
  },
  {
    id: 'activity-4',
    userId: 'user-5',
    user: mockUsers.find(u => u.id === 'user-5'),
    action: 'completed',
    target: 'Brand color palette update',
    targetId: 'task-7',
    createdAt: '2024-05-04T17:00:00Z'
  },
  {
    id: 'activity-5',
    userId: 'user-3',
    user: mockUsers.find(u => u.id === 'user-3'),
    action: 'started working on',
    target: 'Database optimization',
    targetId: 'task-5',
    createdAt: '2024-05-11T09:00:00Z'
  }
]

// Current logged in user (for demo)
export const currentUser = mockUsers[1] // Sarah Johnson - Manager
