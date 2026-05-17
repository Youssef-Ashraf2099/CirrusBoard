import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsNumber } from "class-validator";

export class UploadCompleteDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  attachmentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  eTag?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  size?: number;
}
