import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsNumber } from "class-validator";

export class AttachmentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  attachmentId?: string;

  @ApiProperty()
  @IsString()
  originalKey!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  filename?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  thumbnailKey?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  size?: number;

  @ApiProperty()
  @IsString()
  uploadedAt!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  version?: number;
}
