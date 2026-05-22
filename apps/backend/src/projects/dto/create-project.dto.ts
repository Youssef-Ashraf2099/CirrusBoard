import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsNumber, Min, Max } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  name: string;
  @ApiProperty({ required: false })
  description?: string;
  @ApiProperty({ description: 'Team that owns this project' })
  @IsString()
  teamId: string;
  @ApiProperty({
    required: false,
    enum: ['ACTIVE', 'ARCHIVED', 'COMPLETED'],
  })
  status?: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
  @ApiProperty({ required: false, minimum: 0, maximum: 100 })
  progress?: number;
  @ApiProperty({ required: false })
  startDate?: string;
  @ApiProperty({ required: false })
  endDate?: string;
}
