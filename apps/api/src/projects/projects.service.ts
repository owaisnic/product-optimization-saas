import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(workspaceId: string, data: { name: string; domain?: string }) {
    return this.prisma.project.create({
      data: {
        ...data,
        workspaceId,
      },
      include: { _count: { select: { pages: true } } },
    });
  }

  async findAllForWorkspace(workspaceId: string) {
    return this.prisma.project.findMany({
      where: { workspaceId },
      include: { _count: { select: { pages: true, auditBatches: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        workspace: true,
        _count: { select: { pages: true, auditBatches: true } },
      },
    });
    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  async update(id: string, data: { name?: string; domain?: string }) {
    return this.prisma.project.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.project.delete({ where: { id } });
  }

  async getStats(id: string) {
    const [totalPages, avgScore, issuesByCategory] = await Promise.all([
      this.prisma.productPage.count({ where: { projectId: id } }),
      this.prisma.productPage.aggregate({
        where: { projectId: id, latestScore: { not: null } },
        _avg: { latestScore: true },
      }),
      this.prisma.auditCheckResult.groupBy({
        by: ["category"],
        where: {
          auditRun: { page: { projectId: id } },
          status: { in: ["FAIL", "WARN"] },
        },
        _count: true,
      }),
    ]);

    return {
      totalPages,
      averageScore: avgScore._avg.latestScore || 0,
      issuesByCategory,
    };
  }
}
