module.exports = {
  apps: [{
    name: 'cirrusboard-backend',
    script: 'node_modules/.bin/ts-node',
    args: '-r tsconfig-paths/register src/main.ts',
    cwd: '/appBack/apps/backend',
    env: {
      NODE_ENV: 'production',
      PORT: '3001',
      AWS_REGION: 'eu-north-1',
      COGNITO_USER_POOL_ID: 'eu-north-1_lW8OS7HxU',
      COGNITO_USER_POOL_CLIENT_ID: '6t78o3d1ii5g2ak4p2655nekot',
      USERS_TABLE: 'Users',
      TASKS_TABLE: 'Tasks',
      PROJECTS_TABLE: 'Projects',
      COMMENTS_TABLE: 'Comments',
      TEAMS_TABLE: 'Teams',
      NOTIFICATIONS_TABLE: 'Notifications',
      ACTIVITY_TABLE: 'Activity',
    }
  }]
}
