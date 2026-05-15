import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@ApiTags('Comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a new comment' })
  create(@Body() createCommentDto: CreateCommentDto) {
    const authorId = createCommentDto.authorId ?? 'dummy';
    return this.commentsService.addComment(authorId, createCommentDto.taskId, createCommentDto.content);
  }

  @Get('task/:taskId')
  @ApiOperation({ summary: 'Get comments for a task' })
  findAllForTask(@Param('taskId') taskId: string) {
    return this.commentsService.getCommentsForTask(taskId);
  }

  @Patch(':taskId/:commentId')
  @ApiOperation({ summary: 'Update a comment' })
  update(
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.commentsService.updateComment(taskId, commentId, updateCommentDto.content!);
  }

  @Delete(':taskId/:commentId')
  @ApiOperation({ summary: 'Delete a comment' })
  remove(@Param('taskId') taskId: string, @Param('commentId') commentId: string) {
    return this.commentsService.deleteComment(taskId, commentId);
  }
}
