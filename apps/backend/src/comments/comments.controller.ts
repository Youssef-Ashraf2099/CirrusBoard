import { Controller, Get, Post, Body, Patch, Param, Delete, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { User } from '../common/decorators/user.decorator';
import { UserItem } from '../users/users.model';

@ApiTags('Comments')
@ApiBearerAuth()
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a new comment' })
  create(@User() user: any, @Body() createCommentDto: CreateCommentDto) {
    if (!user) throw new UnauthorizedException('Authentication required');
    return this.commentsService.addComment(
      (user as UserItem).userId,
      createCommentDto.taskId,
      createCommentDto.content,
    );
  }

  @Get('task/:taskId')
  @ApiOperation({ summary: 'Get comments for a task' })
  findAllForTask(@Param('taskId') taskId: string) {
    return this.commentsService.getCommentsForTask(taskId);
  }

  @Patch(':taskId/:commentId')
  @ApiOperation({ summary: 'Update a comment' })
  update(
    @User() user: any,
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    if (!user) throw new UnauthorizedException('Authentication required');
    return this.commentsService.updateComment(taskId, commentId, updateCommentDto.content!);
  }

  @Delete(':taskId/:commentId')
  @ApiOperation({ summary: 'Delete a comment' })
  remove(@User() user: any, @Param('taskId') taskId: string, @Param('commentId') commentId: string) {
    if (!user) throw new UnauthorizedException('Authentication required');
    return this.commentsService.deleteComment(taskId, commentId);
  }
}
