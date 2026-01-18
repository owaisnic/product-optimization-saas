import { IsString, MinLength, IsOptional, IsUrl } from "class-validator";

export class CreateProjectDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @IsOptional()
  domain?: string;
}
