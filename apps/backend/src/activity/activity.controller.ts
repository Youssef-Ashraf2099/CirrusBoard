import { BadRequestException, Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ActivityService } from "./activity.service";
import { CreateActivityDto } from "./dto/create-activity.dto";
import { UserItem } from "../users/users.model";

const DummyUser: UserItem = {
  PK: "USER#dummy",
  userId: "dummy",
  email: "dummy@example.com",
  name: "Dummy Manager",
  role: "MANAGER",
};

@ApiTags("Activity")
@Controller("activity")
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get()
  @ApiOperation({ summary: "Team activity feed" })
  list(
    @Query("teamId") teamId: string,
    @Query("limit") limit?: string,
  ) {
    if (!teamId) throw new BadRequestException("teamId is required");
    const lim = limit ? parseInt(limit, 10) : undefined;
    return this.activity.listForTeam(DummyUser, teamId, lim);
  }

  @Post()
  @ApiOperation({ summary: "Record activity (demo / seeding)" })
  create(@Body() body: CreateActivityDto) {
    return this.activity.create(DummyUser, body);
  }
}
