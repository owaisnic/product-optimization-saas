import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { ProjectsService } from "./projects.service";
import { WorkspacesService } from "../workspaces/workspaces.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";

@Controller()
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(
    private projectsService: ProjectsService,
    private workspacesService: WorkspacesService,
  ) {}

  @Post("workspaces/:workspaceId/projects")
  async create(
    @Param("workspaceId") workspaceId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateProjectDto,
  ) {
    await this.workspacesService.assertRole(workspaceId, user.id, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    return this.projectsService.create(workspaceId, dto);
  }

  @Get("workspaces/:workspaceId/projects")
  async findAll(
    @Param("workspaceId") workspaceId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.workspacesService.isMember(workspaceId, user.id);
    return this.projectsService.findAllForWorkspace(workspaceId);
  }

  @Get("projects/:id")
  async findOne(@Param("id") id: string) {
    return this.projectsService.findById(id);
  }

  @Get("projects/:id/stats")
  async getStats(@Param("id") id: string) {
    return this.projectsService.getStats(id);
  }

  @Patch("projects/:id")
  async update(@Param("id") id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Delete("projects/:id")
  async remove(@Param("id") id: string) {
    return this.projectsService.delete(id);
  }
}
