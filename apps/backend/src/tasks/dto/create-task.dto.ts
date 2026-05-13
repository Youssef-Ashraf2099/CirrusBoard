import { ApiProperty } from '@nestjs/swagger';
import { Attachment } from '../tasks.model';

export class CreateTaskDto {
    @ApiProperty()
    title: string;
  
    @ApiProperty()
    description: string;
  
    @ApiProperty()
    priority: string;
  
    @ApiProperty()
    deadline: string;
  
    @ApiProperty()
    assigneeId: string;
  
    @ApiProperty()
    teamId: string;
  
    @ApiProperty({ required: false })
    status?: string;

    @ApiProperty({ required: false })
    attachments?: Attachment[];
  }