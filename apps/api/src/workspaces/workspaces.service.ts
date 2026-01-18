import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Role } from "@prisma/client";

@Injectable()
export class WorkspacesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: { name: string; slug: string }) {
    return this.prisma.workspace.create({
      data: {
        name: data.name,
        slug: data.slug,
        members: {
          create: {
            userId,
            role: Role.OWNER,
          },
        },
      },
      include: { members: { include: { user: true } } },
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: { include: { user: true } },
        _count: { select: { projects: true } },
      },
    });
  }

  async findById(id: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        members: { include: { user: true } },
        projects: true,
      },
    });
    if (!workspace) throw new NotFoundException("Workspace not found");
    return workspace;
  }

  async findBySlug(slug: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug },
      include: {
        members: { include: { user: true } },
        projects: true,
      },
    });
    if (!workspace) throw new NotFoundException("Workspace not found");
    return workspace;
  }

  async update(id: string, userId: string, data: { name?: string }) {
    await this.assertRole(id, userId, [Role.OWNER, Role.ADMIN]);
    return this.prisma.workspace.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string) {
    await this.assertRole(id, userId, [Role.OWNER]);
    return this.prisma.workspace.delete({ where: { id } });
  }

  async addMember(
    workspaceId: string,
    userId: string,
    email: string,
    role: Role = Role.MEMBER,
  ) {
    await this.assertRole(workspaceId, userId, [Role.OWNER, Role.ADMIN]);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException("User not found");

    return this.prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: user.id,
        role,
      },
      include: { user: true },
    });
  }

  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    userId: string,
    role: Role,
  ) {
    await this.assertRole(workspaceId, userId, [Role.OWNER, Role.ADMIN]);
    return this.prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
      include: { user: true },
    });
  }

  async removeMember(workspaceId: string, memberId: string, userId: string) {
    await this.assertRole(workspaceId, userId, [Role.OWNER, Role.ADMIN]);
    return this.prisma.workspaceMember.delete({ where: { id: memberId } });
  }

  async getMembers(workspaceId: string) {
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true },
    });
  }

  async assertRole(workspaceId: string, userId: string, allowedRoles: Role[]) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member || !allowedRoles.includes(member.role)) {
      throw new ForbiddenException("Insufficient permissions");
    }
    return member;
  }

  async isMember(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    return !!member;
  }
}
