import { Injectable } from "@nestjs/common";
import { CheckStatus, Severity } from "@prisma/client";
import { CheerioAPI } from "cheerio";

export interface AuditContext {
  url: string;
  httpStatus: number;
  responseTime: number;
  html: string;
  $: CheerioAPI;
  headers: Record<string, string>;
}

export interface CheckResult {
  checkId: string;
  category: string;
  status: CheckStatus;
  severity: Severity;
  message: string;
  evidence?: Record<string, any>;
  fixHint?: string;
}

interface CheckDefinition {
  id: string;
  category: string;
  name: string;
  severity: Severity;
  weight: number;
  run: (ctx: AuditContext) => CheckResult;
}

@Injectable()
export class ChecksService {
  private checks: CheckDefinition[] = [
    // ============ INDEXABILITY ============
    {
      id: "http_status_ok",
      category: "indexability",
      name: "HTTP Status OK",
      severity: Severity.CRITICAL,
      weight: 10,
      run: (ctx) => ({
        checkId: "http_status_ok",
        category: "indexability",
        status: ctx.httpStatus === 200 ? CheckStatus.PASS : CheckStatus.FAIL,
        severity: Severity.CRITICAL,
        message:
          ctx.httpStatus === 200
            ? "Page returns HTTP 200"
            : `Page returns HTTP ${ctx.httpStatus}`,
        evidence: { httpStatus: ctx.httpStatus },
        fixHint:
          ctx.httpStatus !== 200
            ? "Ensure the page returns a 200 status code"
            : undefined,
      }),
    },
    {
      id: "no_noindex",
      category: "indexability",
      name: "No Noindex Tag",
      severity: Severity.CRITICAL,
      weight: 10,
      run: (ctx) => {
        const robotsMeta = ctx.$('meta[name="robots"]').attr("content") || "";
        const hasNoindex = robotsMeta.toLowerCase().includes("noindex");
        return {
          checkId: "no_noindex",
          category: "indexability",
          status: hasNoindex ? CheckStatus.FAIL : CheckStatus.PASS,
          severity: Severity.CRITICAL,
          message: hasNoindex
            ? "Page has noindex directive"
            : "Page is indexable",
          evidence: { robotsMeta },
          fixHint: hasNoindex
            ? "Remove noindex from meta robots tag"
            : undefined,
        };
      },
    },
    {
      id: "canonical_present",
      category: "indexability",
      name: "Canonical Tag Present",
      severity: Severity.HIGH,
      weight: 8,
      run: (ctx) => {
        const canonical = ctx.$('link[rel="canonical"]').attr("href");
        return {
          checkId: "canonical_present",
          category: "indexability",
          status: canonical ? CheckStatus.PASS : CheckStatus.FAIL,
          severity: Severity.HIGH,
          message: canonical
            ? "Canonical tag present"
            : "No canonical tag found",
          evidence: { canonical },
          fixHint: !canonical
            ? "Add a canonical tag pointing to the preferred URL"
            : undefined,
        };
      },
    },
    {
      id: "canonical_self",
      category: "indexability",
      name: "Canonical Points to Self",
      severity: Severity.MEDIUM,
      weight: 5,
      run: (ctx) => {
        const canonical = ctx.$('link[rel="canonical"]').attr("href");
        if (!canonical) {
          return {
            checkId: "canonical_self",
            category: "indexability",
            status: CheckStatus.SKIP,
            severity: Severity.MEDIUM,
            message: "No canonical tag to evaluate",
          };
        }
        const normalizedCanonical = new URL(canonical, ctx.url).href.replace(
          /\/$/,
          "",
        );
        const normalizedUrl = ctx.url.replace(/\/$/, "");
        const isSelf = normalizedCanonical === normalizedUrl;
        return {
          checkId: "canonical_self",
          category: "indexability",
          status: isSelf ? CheckStatus.PASS : CheckStatus.WARN,
          severity: Severity.MEDIUM,
          message: isSelf
            ? "Canonical points to self"
            : "Canonical points to different URL",
          evidence: { canonical, pageUrl: ctx.url },
          fixHint: !isSelf
            ? "Consider if this page should have a self-referencing canonical"
            : undefined,
        };
      },
    },

    // ============ METADATA ============
    {
      id: "title_present",
      category: "metadata",
      name: "Title Tag Present",
      severity: Severity.CRITICAL,
      weight: 10,
      run: (ctx) => {
        const title = ctx.$("title").text().trim();
        return {
          checkId: "title_present",
          category: "metadata",
          status: title ? CheckStatus.PASS : CheckStatus.FAIL,
          severity: Severity.CRITICAL,
          message: title ? "Title tag present" : "No title tag found",
          evidence: { title },
          fixHint: !title ? "Add a descriptive title tag" : undefined,
        };
      },
    },
    {
      id: "title_length",
      category: "metadata",
      name: "Title Length Optimal",
      severity: Severity.MEDIUM,
      weight: 5,
      run: (ctx) => {
        const title = ctx.$("title").text().trim();
        const len = title.length;
        let status: CheckStatus = CheckStatus.PASS;
        let message = `Title length is ${len} characters (optimal)`;

        if (len === 0) {
          status = CheckStatus.FAIL;
          message = "No title tag";
        } else if (len < 30) {
          status = CheckStatus.WARN;
          message = `Title too short (${len} chars, recommend 30-60)`;
        } else if (len > 60) {
          status = CheckStatus.WARN;
          message = `Title may be truncated (${len} chars, recommend 30-60)`;
        }

        return {
          checkId: "title_length",
          category: "metadata",
          status,
          severity: Severity.MEDIUM,
          message,
          evidence: { title, length: len },
          fixHint:
            status !== CheckStatus.PASS
              ? "Keep title between 30-60 characters"
              : undefined,
        };
      },
    },
    {
      id: "meta_desc_present",
      category: "metadata",
      name: "Meta Description Present",
      severity: Severity.HIGH,
      weight: 8,
      run: (ctx) => {
        const desc = ctx.$('meta[name="description"]').attr("content")?.trim();
        return {
          checkId: "meta_desc_present",
          category: "metadata",
          status: desc ? CheckStatus.PASS : CheckStatus.FAIL,
          severity: Severity.HIGH,
          message: desc
            ? "Meta description present"
            : "No meta description found",
          evidence: { description: desc?.substring(0, 200) },
          fixHint: !desc ? "Add a compelling meta description" : undefined,
        };
      },
    },
    {
      id: "meta_desc_length",
      category: "metadata",
      name: "Meta Description Length Optimal",
      severity: Severity.LOW,
      weight: 3,
      run: (ctx) => {
        const desc =
          ctx.$('meta[name="description"]').attr("content")?.trim() || "";
        const len = desc.length;
        let status: CheckStatus = CheckStatus.PASS;
        let message = `Meta description length is ${len} characters (optimal)`;

        if (len === 0) {
          status = CheckStatus.SKIP;
          message = "No meta description to evaluate";
        } else if (len < 120) {
          status = CheckStatus.WARN;
          message = `Meta description short (${len} chars, recommend 120-160)`;
        } else if (len > 160) {
          status = CheckStatus.WARN;
          message = `Meta description may be truncated (${len} chars)`;
        }

        return {
          checkId: "meta_desc_length",
          category: "metadata",
          status,
          severity: Severity.LOW,
          message,
          evidence: { length: len },
          fixHint:
            status === CheckStatus.WARN
              ? "Keep meta description between 120-160 characters"
              : undefined,
        };
      },
    },

    // ============ CONTENT ============
    {
      id: "h1_present",
      category: "content",
      name: "H1 Tag Present",
      severity: Severity.HIGH,
      weight: 8,
      run: (ctx) => {
        const h1s = ctx.$("h1");
        const h1Text = h1s.first().text().trim();
        return {
          checkId: "h1_present",
          category: "content",
          status: h1s.length > 0 ? CheckStatus.PASS : CheckStatus.FAIL,
          severity: Severity.HIGH,
          message: h1s.length > 0 ? "H1 tag present" : "No H1 tag found",
          evidence: { h1: h1Text, count: h1s.length },
          fixHint:
            h1s.length === 0
              ? "Add a descriptive H1 tag for the product"
              : undefined,
        };
      },
    },
    {
      id: "h1_single",
      category: "content",
      name: "Single H1 Tag",
      severity: Severity.LOW,
      weight: 3,
      run: (ctx) => {
        const h1Count = ctx.$("h1").length;
        return {
          checkId: "h1_single",
          category: "content",
          status:
            h1Count === 1
              ? CheckStatus.PASS
              : h1Count === 0
                ? CheckStatus.SKIP
                : CheckStatus.WARN,
          severity: Severity.LOW,
          message:
            h1Count === 1
              ? "Single H1 tag (good)"
              : h1Count === 0
                ? "No H1 tag"
                : `Multiple H1 tags found (${h1Count})`,
          evidence: { count: h1Count },
          fixHint:
            h1Count > 1 ? "Consider using only one H1 tag per page" : undefined,
        };
      },
    },
    {
      id: "images_present",
      category: "content",
      name: "Product Images Present",
      severity: Severity.HIGH,
      weight: 8,
      run: (ctx) => {
        const images = ctx.$("img");
        return {
          checkId: "images_present",
          category: "content",
          status: images.length > 0 ? CheckStatus.PASS : CheckStatus.FAIL,
          severity: Severity.HIGH,
          message:
            images.length > 0
              ? `${images.length} images found`
              : "No images found",
          evidence: { imageCount: images.length },
          fixHint: images.length === 0 ? "Add product images" : undefined,
        };
      },
    },
    {
      id: "images_have_alt",
      category: "content",
      name: "Images Have Alt Text",
      severity: Severity.MEDIUM,
      weight: 5,
      run: (ctx) => {
        const images = ctx.$("img");
        const imagesWithAlt = ctx.$('img[alt]:not([alt=""])');
        const total = images.length;
        const withAlt = imagesWithAlt.length;
        const percentage = total > 0 ? Math.round((withAlt / total) * 100) : 0;

        let status: CheckStatus = CheckStatus.PASS;
        if (total === 0) {
          status = CheckStatus.SKIP;
        } else if (percentage < 50) {
          status = CheckStatus.FAIL;
        } else if (percentage < 100) {
          status = CheckStatus.WARN;
        }

        return {
          checkId: "images_have_alt",
          category: "content",
          status,
          severity: Severity.MEDIUM,
          message:
            total === 0
              ? "No images to evaluate"
              : `${withAlt}/${total} images have alt text (${percentage}%)`,
          evidence: { total, withAlt, percentage },
          fixHint:
            status !== CheckStatus.PASS && status !== CheckStatus.SKIP
              ? "Add descriptive alt text to all product images"
              : undefined,
        };
      },
    },
    {
      id: "content_length",
      category: "content",
      name: "Sufficient Content Length",
      severity: Severity.MEDIUM,
      weight: 5,
      run: (ctx) => {
        const bodyText = ctx.$("body").text().replace(/\s+/g, " ").trim();
        const wordCount = bodyText.split(/\s+/).length;

        let status: CheckStatus = CheckStatus.PASS;
        let message = `Content has ${wordCount} words`;

        if (wordCount < 100) {
          status = CheckStatus.FAIL;
          message = `Very thin content (${wordCount} words)`;
        } else if (wordCount < 300) {
          status = CheckStatus.WARN;
          message = `Content may be thin (${wordCount} words)`;
        }

        return {
          checkId: "content_length",
          category: "content",
          status,
          severity: Severity.MEDIUM,
          message,
          evidence: { wordCount },
          fixHint:
            status !== CheckStatus.PASS
              ? "Add more descriptive content about the product"
              : undefined,
        };
      },
    },

    // ============ SCHEMA ============
    {
      id: "schema_product",
      category: "schema",
      name: "Product Schema Present",
      severity: Severity.HIGH,
      weight: 10,
      run: (ctx) => {
        const scripts = ctx.$('script[type="application/ld+json"]');
        let hasProduct = false;
        let productData: any = null;

        scripts.each((_, el) => {
          try {
            const json = JSON.parse(ctx.$(el).html() || "");
            const items = Array.isArray(json) ? json : [json];
            for (const item of items) {
              if (
                item["@type"] === "Product" ||
                item["@type"]?.includes?.("Product")
              ) {
                hasProduct = true;
                productData = item;
              }
            }
          } catch {}
        });

        return {
          checkId: "schema_product",
          category: "schema",
          status: hasProduct ? CheckStatus.PASS : CheckStatus.FAIL,
          severity: Severity.HIGH,
          message: hasProduct
            ? "Product schema found"
            : "No Product schema found",
          evidence: hasProduct
            ? { name: productData?.name, brand: productData?.brand?.name }
            : undefined,
          fixHint: !hasProduct
            ? "Add Product structured data (JSON-LD)"
            : undefined,
        };
      },
    },
    {
      id: "schema_offer",
      category: "schema",
      name: "Offer Schema Present",
      severity: Severity.HIGH,
      weight: 8,
      run: (ctx) => {
        const scripts = ctx.$('script[type="application/ld+json"]');
        let hasOffer = false;
        let offerData: any = null;

        scripts.each((_, el) => {
          try {
            const json = JSON.parse(ctx.$(el).html() || "");
            const items = Array.isArray(json) ? json : [json];
            for (const item of items) {
              if (item["@type"] === "Product") {
                if (item.offers) {
                  hasOffer = true;
                  offerData = item.offers;
                }
              }
            }
          } catch {}
        });

        return {
          checkId: "schema_offer",
          category: "schema",
          status: hasOffer ? CheckStatus.PASS : CheckStatus.FAIL,
          severity: Severity.HIGH,
          message: hasOffer
            ? "Offer schema found"
            : "No Offer schema in Product",
          evidence: hasOffer
            ? { price: offerData?.price, currency: offerData?.priceCurrency }
            : undefined,
          fixHint: !hasOffer
            ? "Add Offer data to Product schema with price and availability"
            : undefined,
        };
      },
    },
    {
      id: "schema_offer_price",
      category: "schema",
      name: "Offer Has Price",
      severity: Severity.HIGH,
      weight: 8,
      run: (ctx) => {
        const scripts = ctx.$('script[type="application/ld+json"]');
        let hasPrice = false;
        let priceValue: string | null = null;

        scripts.each((_, el) => {
          try {
            const json = JSON.parse(ctx.$(el).html() || "");
            const items = Array.isArray(json) ? json : [json];
            for (const item of items) {
              if (item["@type"] === "Product" && item.offers) {
                const offers = Array.isArray(item.offers)
                  ? item.offers
                  : [item.offers];
                for (const offer of offers) {
                  if (offer.price || offer.lowPrice) {
                    hasPrice = true;
                    priceValue = offer.price || offer.lowPrice;
                  }
                }
              }
            }
          } catch {}
        });

        return {
          checkId: "schema_offer_price",
          category: "schema",
          status: hasPrice ? CheckStatus.PASS : CheckStatus.FAIL,
          severity: Severity.HIGH,
          message: hasPrice
            ? `Price found: ${priceValue}`
            : "No price in Offer schema",
          evidence: { price: priceValue },
          fixHint: !hasPrice ? "Add price to Offer schema" : undefined,
        };
      },
    },
    {
      id: "schema_offer_availability",
      category: "schema",
      name: "Offer Has Availability",
      severity: Severity.MEDIUM,
      weight: 5,
      run: (ctx) => {
        const scripts = ctx.$('script[type="application/ld+json"]');
        let hasAvailability = false;
        let availabilityValue: string | null = null;

        scripts.each((_, el) => {
          try {
            const json = JSON.parse(ctx.$(el).html() || "");
            const items = Array.isArray(json) ? json : [json];
            for (const item of items) {
              if (item["@type"] === "Product" && item.offers) {
                const offers = Array.isArray(item.offers)
                  ? item.offers
                  : [item.offers];
                for (const offer of offers) {
                  if (offer.availability) {
                    hasAvailability = true;
                    availabilityValue = offer.availability;
                  }
                }
              }
            }
          } catch {}
        });

        return {
          checkId: "schema_offer_availability",
          category: "schema",
          status: hasAvailability ? CheckStatus.PASS : CheckStatus.WARN,
          severity: Severity.MEDIUM,
          message: hasAvailability
            ? "Availability status found"
            : "No availability in Offer schema",
          evidence: { availability: availabilityValue },
          fixHint: !hasAvailability
            ? "Add availability to Offer schema (e.g., InStock, OutOfStock)"
            : undefined,
        };
      },
    },
    {
      id: "schema_reviews",
      category: "schema",
      name: "Review/Rating Schema",
      severity: Severity.MEDIUM,
      weight: 5,
      run: (ctx) => {
        const scripts = ctx.$('script[type="application/ld+json"]');
        let hasReviews = false;
        let ratingData: any = null;

        scripts.each((_, el) => {
          try {
            const json = JSON.parse(ctx.$(el).html() || "");
            const items = Array.isArray(json) ? json : [json];
            for (const item of items) {
              if (item["@type"] === "Product") {
                if (item.aggregateRating || item.review) {
                  hasReviews = true;
                  ratingData = item.aggregateRating;
                }
              }
            }
          } catch {}
        });

        return {
          checkId: "schema_reviews",
          category: "schema",
          status: hasReviews ? CheckStatus.PASS : CheckStatus.SKIP,
          severity: Severity.MEDIUM,
          message: hasReviews
            ? "Review/rating schema found"
            : "No review schema (optional but recommended)",
          evidence: hasReviews
            ? {
                ratingValue: ratingData?.ratingValue,
                reviewCount: ratingData?.reviewCount,
              }
            : undefined,
          fixHint: !hasReviews
            ? "Consider adding AggregateRating and Review schema"
            : undefined,
        };
      },
    },

    // ============ VARIANT RISK ============
    {
      id: "url_clean",
      category: "variantRisk",
      name: "Clean URL Structure",
      severity: Severity.LOW,
      weight: 3,
      run: (ctx) => {
        const url = new URL(ctx.url);
        const hasParams = url.search.length > 0;
        const hasSessionId = /[?&](sid|session|phpsessid|jsessionid)/i.test(
          url.search,
        );

        let status: CheckStatus = CheckStatus.PASS;
        let message = "URL is clean";

        if (hasSessionId) {
          status = CheckStatus.FAIL;
          message = "URL contains session parameters";
        } else if (hasParams) {
          status = CheckStatus.WARN;
          message = "URL contains query parameters";
        }

        return {
          checkId: "url_clean",
          category: "variantRisk",
          status,
          severity: Severity.LOW,
          message,
          evidence: { url: ctx.url, hasParams, hasSessionId },
          fixHint:
            status !== CheckStatus.PASS
              ? "Use clean URLs without tracking or session parameters"
              : undefined,
        };
      },
    },

    // ============ AI READINESS ============
    {
      id: "structured_specs",
      category: "aiReadiness",
      name: "Structured Product Specs",
      severity: Severity.LOW,
      weight: 3,
      run: (ctx) => {
        const hasTables = ctx.$("table").length > 0;
        const hasDefinitionLists = ctx.$("dl").length > 0;
        const hasSpecsSection =
          ctx.$('[class*="spec"], [class*="detail"], [class*="attribute"]')
            .length > 0;
        const hasStructure = hasTables || hasDefinitionLists || hasSpecsSection;

        return {
          checkId: "structured_specs",
          category: "aiReadiness",
          status: hasStructure ? CheckStatus.PASS : CheckStatus.WARN,
          severity: Severity.LOW,
          message: hasStructure
            ? "Structured specifications found"
            : "No structured specifications detected",
          evidence: { hasTables, hasDefinitionLists, hasSpecsSection },
          fixHint: !hasStructure
            ? "Add structured product specifications (table or definition list)"
            : undefined,
        };
      },
    },
    {
      id: "faq_present",
      category: "aiReadiness",
      name: "FAQ Section Present",
      severity: Severity.LOW,
      weight: 3,
      run: (ctx) => {
        const hasFaqSchema = ctx
          .$('script[type="application/ld+json"]')
          .text()
          .includes("FAQPage");
        const hasFaqSection =
          ctx.$('[class*="faq"], [id*="faq"], [class*="question"]').length > 0;
        const hasFaq = hasFaqSchema || hasFaqSection;

        return {
          checkId: "faq_present",
          category: "aiReadiness",
          status: hasFaq ? CheckStatus.PASS : CheckStatus.SKIP,
          severity: Severity.LOW,
          message: hasFaq
            ? "FAQ section detected"
            : "No FAQ section found (optional but good for AI)",
          evidence: { hasFaqSchema, hasFaqSection },
          fixHint: !hasFaq
            ? "Consider adding a FAQ section for common product questions"
            : undefined,
        };
      },
    },
    {
      id: "response_time",
      category: "indexability",
      name: "Fast Response Time",
      severity: Severity.MEDIUM,
      weight: 5,
      run: (ctx) => {
        const time = ctx.responseTime;
        let status: CheckStatus = CheckStatus.PASS;
        let message = `Response time: ${time}ms (fast)`;

        if (time > 3000) {
          status = CheckStatus.FAIL;
          message = `Response time: ${time}ms (very slow)`;
        } else if (time > 1500) {
          status = CheckStatus.WARN;
          message = `Response time: ${time}ms (slow)`;
        }

        return {
          checkId: "response_time",
          category: "indexability",
          status,
          severity: Severity.MEDIUM,
          message,
          evidence: { responseTime: time },
          fixHint:
            status !== CheckStatus.PASS
              ? "Improve server response time"
              : undefined,
        };
      },
    },
  ];

  async runAllChecks(context: AuditContext): Promise<CheckResult[]> {
    return this.checks.map((check) => {
      try {
        return check.run(context);
      } catch (error: any) {
        return {
          checkId: check.id,
          category: check.category,
          status: CheckStatus.SKIP,
          severity: check.severity,
          message: `Check failed: ${error.message}`,
        };
      }
    });
  }

  calculateScore(results: CheckResult[]): {
    overall: number;
    metadata: number;
    schema: number;
    indexability: number;
    content: number;
    variantRisk: number;
    aiReadiness: number;
  } {
    const categoryWeights: Record<string, number> = {
      metadata: 20,
      schema: 25,
      indexability: 25,
      content: 15,
      variantRisk: 10,
      aiReadiness: 5,
    };

    const categoryScores: Record<string, { passed: number; total: number }> =
      {};

    for (const check of this.checks) {
      if (!categoryScores[check.category]) {
        categoryScores[check.category] = { passed: 0, total: 0 };
      }
      categoryScores[check.category].total += check.weight;
    }

    for (const result of results) {
      const check = this.checks.find((c) => c.id === result.checkId);
      if (!check) continue;

      if (result.status === CheckStatus.PASS) {
        categoryScores[check.category].passed += check.weight;
      } else if (result.status === CheckStatus.WARN) {
        categoryScores[check.category].passed += check.weight * 0.5;
      }
    }

    const scores: Record<string, number> = {};
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [category, weight] of Object.entries(categoryWeights)) {
      const catScore = categoryScores[category];
      const score =
        catScore && catScore.total > 0
          ? Math.round((catScore.passed / catScore.total) * 100)
          : 100;
      scores[category] = score;
      weightedSum += score * weight;
      totalWeight += weight;
    }

    return {
      overall: Math.round(weightedSum / totalWeight),
      metadata: scores.metadata || 0,
      schema: scores.schema || 0,
      indexability: scores.indexability || 0,
      content: scores.content || 0,
      variantRisk: scores.variantRisk || 0,
      aiReadiness: scores.aiReadiness || 0,
    };
  }
}
