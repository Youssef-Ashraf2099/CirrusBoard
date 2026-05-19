import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from "@nestjs/swagger";
import { TasksService } from "./tasks.service";
import { CreateTaskDto } from "./dto/create-task.dto";
//import { UploadRequestDto } from "./dto/upload-request.dto";
//import { ResizeRequestDto } from "./dto/resize-request.dto";
import { UploadCompleteDto } from "./dto/upload-complete.dto";
import { UserItem } from "../users/users.model";
import { TaskItem } from "./tasks.model";
import { User } from "../common/decorators/user.decorator";

// No dummy fallback in controllers; require authentication via `@User()` decorator

@ApiTags("Tasks")
@ApiBearerAuth()
@Controller("tasks")
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: "Create a new task" })
  create(@User() user: any, @Body() createTaskDto: CreateTaskDto) {
    if (!user) throw new UnauthorizedException("Authentication required");
    return this.tasksService.createTask(user as UserItem, createTaskDto);
  }

  @Get("team/:teamId")
  @ApiOperation({ summary: "List tasks for a team" })
  listForTeam(@User() user: any, @Param("teamId") teamId: string) {
    if (!user) throw new UnauthorizedException("Authentication required");
    return this.tasksService.listTasksForTeam(user as UserItem, teamId);
  }

  @Get('team/:teamId')
  @ApiOperation({ summary: 'List tasks for a team' })
  listForTeam(@Param('teamId') teamId: string) {
    return this.tasksService.listTasksForTeam(user as  UserItem, teamId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a task by ID" })
  findOne(@User() user: any, @Param("id") id: string) {
    if (!user) throw new UnauthorizedException("Authentication required");
    return this.tasksService.getTask(user as UserItem, id);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Update task status" })
  @ApiBody({
    schema: { type: "object", properties: { status: { type: "string" } } },
  })
  updateStatus(
    @User() user: any,
    @Param("id") id: string,
    @Body("status") status: TaskItem["status"],
  ) {
    if (!user) throw new UnauthorizedException("Authentication required");
    return this.tasksService.updateStatus(user as UserItem, id, status);
  }

  @Patch(":id/assign")
  @ApiOperation({ summary: "Assign a task" })
  @ApiBody({
    schema: { type: "object", properties: { assigneeId: { type: "string" } } },
  })
  assignTask(
    @User() user: any,
    @Param("id") id: string,
    @Body("assigneeId") assigneeId: string,
  ) {
    if (!user) throw new UnauthorizedException("Authentication required");
    return this.tasksService.assignTask(user as UserItem, id, assigneeId);
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
  @Delete(":id")
  @ApiOperation({ summary: "Delete a task" })
  remove(@User() user: any, @Param("id") id: string) {
    if (!user) throw new UnauthorizedException("Authentication required");
    return this.tasksService.deleteTask(user as UserItem, id);
  }

  /*@Post(":id/upload-url")
  @ApiOperation({ summary: "Get presigned upload URL for a task attachment" })
  presign(
    @User() user: any,
    @Param("id") id: string,
    @Body() body: UploadRequestDto,
  ) {
    if (!user) throw new UnauthorizedException("Authentication required");
    return this.tasksService.getUploadUrlForTask(
      user as UserItem,
      id,
      body.filename,
      body.contentType,
    );
  }*/

  @Post(":id/upload-complete")
  @ApiOperation({ summary: "Confirm upload and update attachment metadata" })
  uploadComplete(
    @User() user: any,
    @Param("id") id: string,
    @Body() body: UploadCompleteDto,
  ) {
    if (!user) throw new UnauthorizedException("Authentication required");
    return this.tasksService.confirmUpload(user as UserItem, id, body as any);
  }

  /*@Post(":id/resize")
  @ApiOperation({ summary: "Resize an attachment via Lambda" })
  async resize(
    @User() user: any,
    @Param("id") id: string,
    @Body() body: ResizeRequestDto,
  ) {
    if (!user) throw new UnauthorizedException("Authentication required");
    // find key if attachmentId provided
    let key = body.key;
    if (body.attachmentId && !key) {
      const task = await this.tasksService.getTask(user as UserItem, id);
      const att = (task.attachments || []).find(
        (a) => a.attachmentId === body.attachmentId,
      );
      key = att?.originalKey;
    }
    if (!key) throw new Error("No attachment key provided or found");
    const fn =
      body.functionName || process.env.IMAGE_RESIZE_FUNCTION || "image-resize";
    const res = await this.tasksService.invokeImageResize(fn, { key });
    return res;
  }*/
}
