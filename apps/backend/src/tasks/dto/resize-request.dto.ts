import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class ResizeRequestDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  attachmentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  functionName?: string;
}
