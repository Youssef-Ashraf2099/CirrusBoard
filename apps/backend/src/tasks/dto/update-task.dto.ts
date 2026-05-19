import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsIn, IsArray } from "class-validator";
import { AttachmentDto } from "./attachment.dto";
import { Attachment } from "../tasks.model";

export class UpdateTaskDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsIn(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
  priority?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deadline?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsIn(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"])
  status?: string;

  @ApiProperty({ type: () => [AttachmentDto], required: false })
  @IsOptional()
  @IsArray()
  attachments?: Attachment[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];
}
