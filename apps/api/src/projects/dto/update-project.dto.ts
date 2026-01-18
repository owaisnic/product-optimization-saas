import { IsString, MinLength, IsOptional } from "class-validator";

export class UpdateProjectDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  domain?: string;
}
