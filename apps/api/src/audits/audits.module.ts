import { Module } from "@nestjs/common";
import { AuditsService } from "./audits.service";
import { AuditsController } from "./audits.controller";
import { ChecksService } from "./checks/checks.service";
import { PagesModule } from "../pages/pages.module";

@Module({
  imports: [PagesModule],
  providers: [AuditsService, ChecksService],
  controllers: [AuditsController],
  exports: [AuditsService],
})
export class AuditsModule {}
