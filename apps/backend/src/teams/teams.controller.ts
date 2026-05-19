import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { TeamsService } from "./teams.service";
import { CreateTeamDto } from "./dto/create-team.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";
import { UserItem } from "../users/users.model";

const DummyUser: UserItem = {
  PK: "USER#dummy",
  userId: "dummy",
  email: "dummy@example.com",
  name: "Dummy Manager",
  role: "MANAGER",
};

@ApiTags("Teams")
@Controller("teams")
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Post()
  @ApiOperation({ summary: "Create team" })
  create(@Body() body: CreateTeamDto) {
    return this.teams.create(DummyUser, body);
  }

  @Get()
  @ApiOperation({ summary: "List visible teams" })
  findAll() {
    return this.teams.findAll(DummyUser);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get team; ?expand=members includes user objects" })
  findOne(@Param("id") id: string, @Query("expand") expand?: string) {
    return this.teams.findOne(DummyUser, id, expand === "members");
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update team" })
  update(@Param("id") id: string, @Body() body: UpdateTeamDto) {
    return this.teams.update(DummyUser, id, body);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete team" })
  remove(@Param("id") id: string) {
    return this.teams.remove(DummyUser, id);
  }
}
