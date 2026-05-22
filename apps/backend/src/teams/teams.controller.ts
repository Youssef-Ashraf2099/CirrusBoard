import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { TeamsService } from "./teams.service";
import { CreateTeamDto } from "./dto/create-team.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";
import { UserItem } from "../users/users.model";
import { User } from "../common/decorators/user.decorator";

@ApiTags("Teams")
@ApiBearerAuth()
@Controller("teams")
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Post()
  @ApiOperation({ summary: "Create team" })
  create(@User() user: any, @Body() body: CreateTeamDto) {
    if (!user) throw new UnauthorizedException("Authentication required");
    return this.teams.create(user as UserItem, body);
  }

  @Get()
  @ApiOperation({ summary: "List visible teams" })
  findAll(@User() user: any) {
    if (!user) throw new UnauthorizedException("Authentication required");
    return this.teams.findAll(user as UserItem);
  }

  @Get(":id/members")
  @ApiOperation({
    summary:
      "List team members (users with primaryTeamId on this team + team.memberUserIds)",
  })
  listMembers(@User() user: any, @Param("id") id: string) {
    if (!user) throw new UnauthorizedException("Authentication required");
    return this.teams.listMembers(user as UserItem, id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get team; ?expand=members includes user objects" })
  findOne(
    @User() user: any,
    @Param("id") id: string,
    @Query("expand") expand?: string,
  ) {
    if (!user) throw new UnauthorizedException("Authentication required");
    return this.teams.findOne(user as UserItem, id, expand === "members");
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update team" })
  update(@User() user: any, @Param("id") id: string, @Body() body: UpdateTeamDto) {
    if (!user) throw new UnauthorizedException("Authentication required");
    return this.teams.update(user as UserItem, id, body);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete team" })
  remove(@User() user: any, @Param("id") id: string) {
    if (!user) throw new UnauthorizedException("Authentication required");
    return this.teams.remove(user as UserItem, id);
  }
}
