import { IsString, IsUrl, IsOptional } from "class-validator";

export class CreatePageDto {
  @IsUrl()
  url: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  variantGroup?: string;
}
