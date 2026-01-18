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
import { WorkspacesService } from "./workspaces.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { UpdateWorkspaceDto } from "./dto/update-workspace.dto";
import { AddMemberDto } from "./dto/add-member.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";

@Controller("workspaces")
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private workspacesService: WorkspacesService) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.workspacesService.findAllForUser(user.id);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.workspacesService.findById(id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(id, user.id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: { id: string }) {
    return this.workspacesService.delete(id, user.id);
  }

  @Get(":id/members")
  getMembers(@Param("id") id: string) {
    return this.workspacesService.getMembers(id);
  }

  @Post(":id/members")
  addMember(
    @Param("id") id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: AddMemberDto,
  ) {
    return this.workspacesService.addMember(id, user.id, dto.email, dto.role);
  }

  @Patch(":id/members/:memberId")
  updateMember(
    @Param("id") id: string,
    @Param("memberId") memberId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateMemberDto,
  ) {
    return this.workspacesService.updateMemberRole(
      id,
      memberId,
      user.id,
      dto.role,
    );
  }

  @Delete(":id/members/:memberId")
  removeMember(
    @Param("id") id: string,
    @Param("memberId") memberId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.workspacesService.removeMember(id, memberId, user.id);
  }
}
