import {
  IsArray,
  ValidateNested,
  IsUrl,
  IsString,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";

class UrlItem {
  @IsUrl()
  url: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  variantGroup?: string;
}

export class BulkImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UrlItem)
  urls: UrlItem[];
}
