import { ApiProperty } from '@nestjs/swagger';

export class UpdateProjectDto {
  @ApiProperty({ required: false })
  name?: string;
  @ApiProperty({ required: false })
  description?: string;
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
  @ApiProperty({ required: false })
  teamId?: string;
  @ApiProperty({ required: false, type: [String] })
  memberUserIds?: string[];
}
