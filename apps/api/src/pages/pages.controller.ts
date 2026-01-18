import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PagesService } from "./pages.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreatePageDto } from "./dto/create-page.dto";
import { BulkImportDto } from "./dto/bulk-import.dto";

@Controller()
@UseGuards(JwtAuthGuard)
export class PagesController {
  constructor(private pagesService: PagesService) {}

  @Post("projects/:projectId/pages")
  create(@Param("projectId") projectId: string, @Body() dto: CreatePageDto) {
    return this.pagesService.create(projectId, dto);
  }

  @Post("projects/:projectId/pages/import")
  bulkImport(
    @Param("projectId") projectId: string,
    @Body() dto: BulkImportDto,
  ) {
    return this.pagesService.bulkImport(projectId, dto.urls);
  }

  @Get("projects/:projectId/pages")
  findAll(
    @Param("projectId") projectId: string,
    @Query("skip") skip?: string,
    @Query("take") take?: string,
    @Query("search") search?: string,
    @Query("minScore") minScore?: string,
    @Query("maxScore") maxScore?: string,
  ) {
    return this.pagesService.findAllForProject(projectId, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      search,
      minScore: minScore ? parseInt(minScore, 10) : undefined,
      maxScore: maxScore ? parseInt(maxScore, 10) : undefined,
    });
  }

  @Get("pages/:id")
  findOne(@Param("id") id: string) {
    return this.pagesService.findById(id);
  }

  @Delete("pages/:id")
  remove(@Param("id") id: string) {
    return this.pagesService.delete(id);
  }

  @Post("pages/bulk-delete")
  bulkDelete(@Body() body: { ids: string[] }) {
    return this.pagesService.bulkDelete(body.ids);
  }
}
