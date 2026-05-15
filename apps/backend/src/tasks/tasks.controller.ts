import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UserItem } from '../users/users.model';
import { TaskItem } from './tasks.model';

const DummyUser: UserItem = {
  PK: 'USER#dummy',
  userId: 'dummy',
  email: 'dummy@example.com',
  name: 'Dummy Manager',
  role: 'MANAGER',
};

@ApiTags('Tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  create(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.createTask(DummyUser, createTaskDto);
  }

  @Get('team/:teamId')
  @ApiOperation({ summary: 'List tasks for a team' })
  listForTeam(@Param('teamId') teamId: string) {
    return this.tasksService.listTasksForTeam(DummyUser, teamId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by ID' })
  findOne(@Param('id') id: string) {
    return this.tasksService.getTask(DummyUser, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update task status' })
  @ApiBody({ schema: { type: 'object', properties: { status: { type: 'string' } } } })
  updateStatus(@Param('id') id: string, @Body('status') status: TaskItem["status"]) {
    return this.tasksService.updateStatus(DummyUser, id, status);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign a task' })
  @ApiBody({ schema: { type: 'object', properties: { assigneeId: { type: 'string' } } } })
  assignTask(@Param('id') id: string, @Body('assigneeId') assigneeId: string) {
    return this.tasksService.assignTask(DummyUser, id, assigneeId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task fields' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.updateTask(DummyUser, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  remove(@Param('id') id: string) {
    return this.tasksService.deleteTask(DummyUser, id);
  }
}
