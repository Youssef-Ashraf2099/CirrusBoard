import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../users.model';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'EMPLOYEE', enum: ['EMPLOYEE', 'MANAGER', 'ADMIN'] })
  role: UserRole;

  @ApiProperty({ required: false })
  password?: string;

  @ApiProperty({ required: false })
  primaryTeamId?: string;

  @ApiProperty({ type: [String], required: false })
  teamIds?: string[];
}
