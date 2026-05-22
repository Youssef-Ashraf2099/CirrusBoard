import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ProjectsService } from "./projects.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { UserItem } from "../users/users.model";
import { User } from "../common/decorators/user.decorator";

@ApiTags("Projects")
@ApiBearerAuth()
@Controller("projects")
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new project" })
  create(@User() user: any, @Body() createProjectDto: CreateProjectDto) {
    if (!user) throw new UnauthorizedException("Authentication required");
    return this.projectsService.createProject(
      user as UserItem,
      createProjectDto,
    );
  }

  @Get("team/:teamId")
  @ApiOperation({ summary: "List projects for a team" })
  listForTeam(@User() user: any, @Param("teamId") teamId: string) {
    if (!user) throw new UnauthorizedException("Authentication required");
    return this.projectsService.listProjectsForTeam(user as UserItem, teamId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a project by ID" })
  findOne(@User() user: any, @Param("id") id: string) {
    if (!user) throw new UnauthorizedException("Authentication required");
    return this.projectsService.getProject(user as UserItem, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a project" })
  update(
    @User() user: any,
    @Param("id") id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    if (!user) throw new UnauthorizedException("Authentication required");
    return this.projectsService.updateProject(
      user as UserItem,
      id,
      updateProjectDto,
    );
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a project" })
  remove(@User() user: any, @Param("id") id: string) {
    if (!user) throw new UnauthorizedException("Authentication required");
    return this.projectsService.deleteProject(user as UserItem, id);
  }
}
