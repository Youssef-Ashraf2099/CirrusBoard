import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty()
  taskId: string;
  @ApiProperty()
  content: string;

  @ApiProperty({ required: false, description: 'Author userId (passed from client until auth exists)' })
  authorId?: string;
}
