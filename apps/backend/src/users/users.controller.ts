import { Controller, Get, Post, Body, Patch, Param, Delete, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login (plaintext password match — development only)' })
  login(@Body() dto: LoginUserDto) {
    return this.usersService.validateLogin(dto.email, dto.password);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  create(@Body() createUserDto: CreateUserDto) {
    const raw = createUserDto?.email?.trim();
    if (!raw) {
      throw new BadRequestException('email is required');
    }
    return this.usersService.createUser({
      ...createUserDto,
      email: raw.toLowerCase(),
    });
  }

  @Get()
  @ApiOperation({ summary: 'List users (optionally scoped by primary team)' })
  list(@Query('teamId') teamId?: string) {
    return this.usersService.listUsers(teamId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.getUser(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const updates = { ...updateUserDto };
    if (updates.email) {
      updates.email = updates.email.trim().toLowerCase();
    }
    return this.usersService.updateUser(id, updates);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  remove(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
