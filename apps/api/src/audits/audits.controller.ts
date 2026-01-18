import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { AuditsService } from "./audits.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller()
@UseGuards(JwtAuthGuard)
export class AuditsController {
  constructor(private auditsService: AuditsService) {}

  @Post("projects/:projectId/audits")
  createBatchAudit(
    @Param("projectId") projectId: string,
    @Body() body: { pageIds?: string[] },
  ) {
    return this.auditsService.createBatchAudit(projectId, body.pageIds);
  }

  @Get("projects/:projectId/audits")
  getProjectBatches(@Param("projectId") projectId: string) {
    return this.auditsService.getProjectBatches(projectId);
  }

  @Get("audits/batch/:batchId")
  getBatchStatus(@Param("batchId") batchId: string) {
    return this.auditsService.getBatchStatus(batchId);
  }

  @Post("pages/:pageId/audit")
  runSinglePageAudit(@Param("pageId") pageId: string) {
    return this.auditsService.runSinglePageAudit(pageId);
  }

  @Get("pages/:pageId/audits")
  getPageAuditHistory(@Param("pageId") pageId: string) {
    return this.auditsService.getPageAuditHistory(pageId);
  }

  @Get("audits/:runId")
  getAuditRun(@Param("runId") runId: string) {
    return this.auditsService.getAuditRun(runId);
  }
}
