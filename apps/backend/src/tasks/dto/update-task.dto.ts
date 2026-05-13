import { ApiProperty } from '@nestjs/swagger';

export class UpdateTaskDto {
    @ApiProperty({ required: false })
    title?: string;
  
    @ApiProperty({ required: false })
    description?: string;
  
    @ApiProperty({ required: false })
    priority?: string;
  
    @ApiProperty({ required: false })
    deadline?: string;
  
    @ApiProperty({ required: false })
    assigneeId?: string;
  
    @ApiProperty({ required: false })
    status?: string;
  }