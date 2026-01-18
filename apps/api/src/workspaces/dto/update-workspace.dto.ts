import { IsString, MinLength, IsOptional } from "class-validator";

export class UpdateWorkspaceDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;
}
