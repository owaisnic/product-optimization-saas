import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PagesService {
  constructor(private prisma: PrismaService) {}

  normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      let normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
      normalized = normalized.toLowerCase().replace(/\/+$/, "");
      return normalized;
    } catch {
      throw new BadRequestException(`Invalid URL: ${url}`);
    }
  }

  async create(
    projectId: string,
    data: { url: string; sku?: string; variantGroup?: string },
  ) {
    const normalizedUrl = this.normalizeUrl(data.url);

    return this.prisma.productPage.create({
      data: {
        url: data.url,
        normalizedUrl,
        sku: data.sku,
        variantGroup: data.variantGroup,
        projectId,
      },
    });
  }

  async bulkImport(
    projectId: string,
    urls: Array<{ url: string; sku?: string; variantGroup?: string }>,
  ) {
    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const item of urls) {
      try {
        const normalizedUrl = this.normalizeUrl(item.url);

        const existing = await this.prisma.productPage.findUnique({
          where: { projectId_normalizedUrl: { projectId, normalizedUrl } },
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        await this.prisma.productPage.create({
          data: {
            url: item.url,
            normalizedUrl,
            sku: item.sku,
            variantGroup: item.variantGroup,
            projectId,
          },
        });
        results.created++;
      } catch (error: any) {
        results.errors.push(`${item.url}: ${error.message}`);
      }
    }

    return results;
  }

  async findAllForProject(
    projectId: string,
    options: {
      skip?: number;
      take?: number;
      search?: string;
      minScore?: number;
      maxScore?: number;
    } = {},
  ) {
    const { skip = 0, take = 50, search, minScore, maxScore } = options;

    const where: any = { projectId };

    if (search) {
      where.OR = [
        { url: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    if (minScore !== undefined || maxScore !== undefined) {
      where.latestScore = {};
      if (minScore !== undefined) where.latestScore.gte = minScore;
      if (maxScore !== undefined) where.latestScore.lte = maxScore;
    }

    const [pages, total] = await Promise.all([
      this.prisma.productPage.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          audits: {
            take: 1,
            orderBy: { createdAt: "desc" },
            include: { score: true },
          },
        },
      }),
      this.prisma.productPage.count({ where }),
    ]);

    return { pages, total, skip, take };
  }

  async findById(id: string) {
    const page = await this.prisma.productPage.findUnique({
      where: { id },
      include: {
        project: true,
        audits: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: { score: true },
        },
      },
    });
    if (!page) throw new NotFoundException("Page not found");
    return page;
  }

  async delete(id: string) {
    return this.prisma.productPage.delete({ where: { id } });
  }

  async bulkDelete(ids: string[]) {
    return this.prisma.productPage.deleteMany({ where: { id: { in: ids } } });
  }
}
