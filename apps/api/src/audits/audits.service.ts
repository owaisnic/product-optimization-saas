import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ChecksService } from "./checks/checks.service";
import { AuditStatus, BatchStatus } from "@prisma/client";
import * as cheerio from "cheerio";

@Injectable()
export class AuditsService {
  constructor(
    private prisma: PrismaService,
    private checksService: ChecksService,
  ) {}

  async createBatchAudit(projectId: string, pageIds?: string[]) {
    const pages = pageIds
      ? await this.prisma.productPage.findMany({
          where: { id: { in: pageIds }, projectId },
        })
      : await this.prisma.productPage.findMany({
          where: { projectId },
        });

    if (pages.length === 0) {
      throw new NotFoundException("No pages found to audit");
    }

    const batch = await this.prisma.auditBatch.create({
      data: {
        projectId,
        totalUrls: pages.length,
        status: BatchStatus.QUEUED,
        runs: {
          create: pages.map((page) => ({
            pageId: page.id,
            status: AuditStatus.QUEUED,
          })),
        },
      },
      include: { runs: true },
    });

    this.processBatch(batch.id);

    return batch;
  }

  private async processBatch(batchId: string) {
    await this.prisma.auditBatch.update({
      where: { id: batchId },
      data: { status: BatchStatus.RUNNING },
    });

    const runs = await this.prisma.auditRun.findMany({
      where: { batchId, status: AuditStatus.QUEUED },
      include: { page: true },
    });

    for (const run of runs) {
      try {
        await this.executeAuditRun(run.id, run.page.url);
        await this.prisma.auditBatch.update({
          where: { id: batchId },
          data: { completed: { increment: 1 } },
        });
      } catch (error) {
        await this.prisma.auditBatch.update({
          where: { id: batchId },
          data: { failed: { increment: 1 } },
        });
      }
    }

    await this.prisma.auditBatch.update({
      where: { id: batchId },
      data: { status: BatchStatus.COMPLETED },
    });
  }

  async runSinglePageAudit(pageId: string) {
    const page = await this.prisma.productPage.findUnique({
      where: { id: pageId },
    });

    if (!page) throw new NotFoundException("Page not found");

    const run = await this.prisma.auditRun.create({
      data: {
        pageId,
        status: AuditStatus.QUEUED,
      },
    });

    this.executeAuditRun(run.id, page.url);

    return run;
  }

  private async executeAuditRun(runId: string, url: string) {
    await this.prisma.auditRun.update({
      where: { id: runId },
      data: { status: AuditStatus.RUNNING, startedAt: new Date() },
    });

    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        headers: {
          "User-Agent": "ProductPageIntelligence/1.0 (SEO Audit Bot)",
        },
        redirect: "follow",
      });
      const responseTime = Date.now() - startTime;

      const html = await response.text();
      const $ = cheerio.load(html);

      const context = {
        url,
        httpStatus: response.status,
        responseTime,
        html,
        $,
        headers: Object.fromEntries(response.headers.entries()),
      };

      const checkResults = await this.checksService.runAllChecks(context);

      const score = this.checksService.calculateScore(checkResults);

      await this.prisma.auditRun.update({
        where: { id: runId },
        data: {
          status: AuditStatus.COMPLETED,
          completedAt: new Date(),
          httpStatus: response.status,
          responseTime,
          htmlSnapshot: html.substring(0, 50000),
          checks: {
            create: checkResults.map((result) => ({
              checkId: result.checkId,
              category: result.category,
              status: result.status,
              severity: result.severity,
              message: result.message,
              evidence: result.evidence
                ? JSON.stringify(result.evidence)
                : null,
              fixHint: result.fixHint,
            })),
          },
          score: {
            create: score,
          },
        },
      });

      const run = await this.prisma.auditRun.findUnique({
        where: { id: runId },
        include: { page: true },
      });

      if (run?.page) {
        await this.prisma.productPage.update({
          where: { id: run.page.id },
          data: { latestScore: score.overall },
        });
      }
    } catch (error: any) {
      await this.prisma.auditRun.update({
        where: { id: runId },
        data: {
          status: AuditStatus.FAILED,
          completedAt: new Date(),
          errorMessage: error.message,
        },
      });
    }
  }

  async getBatchStatus(batchId: string) {
    const batch = await this.prisma.auditBatch.findUnique({
      where: { id: batchId },
      include: {
        runs: {
          include: { score: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!batch) throw new NotFoundException("Batch not found");

    return {
      ...batch,
      progress: {
        total: batch.totalUrls,
        completed: batch.completed,
        failed: batch.failed,
        remaining: batch.totalUrls - batch.completed - batch.failed,
        percentComplete: Math.round(
          ((batch.completed + batch.failed) / batch.totalUrls) * 100,
        ),
      },
    };
  }

  async getAuditRun(runId: string) {
    const run = await this.prisma.auditRun.findUnique({
      where: { id: runId },
      include: {
        page: true,
        score: true,
        checks: {
          orderBy: [{ severity: "asc" }, { status: "asc" }],
        },
      },
    });

    if (!run) throw new NotFoundException("Audit run not found");

    return run;
  }

  async getPageAuditHistory(pageId: string) {
    return this.prisma.auditRun.findMany({
      where: { pageId },
      include: { score: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  async getProjectBatches(projectId: string) {
    return this.prisma.auditBatch.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }
}
