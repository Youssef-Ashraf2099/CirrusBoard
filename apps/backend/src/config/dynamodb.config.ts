export const DynamoDbConfig = {
  tasksTable: process.env.TASKS_TABLE || "Tasks",
  projectsTable: process.env.PROJECTS_TABLE || "Projects",
  commentsTable: process.env.COMMENTS_TABLE || "Comments",
  usersTable: process.env.USERS_TABLE || "Users",
};

export function getTableName(key: keyof typeof DynamoDbConfig) {
  return DynamoDbConfig[key];
}
