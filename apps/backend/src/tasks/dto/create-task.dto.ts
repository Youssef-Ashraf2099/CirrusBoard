import { ApiProperty } from "@nestjs/swagger";
import { Attachment } from "../tasks.model";
import { IsString, IsOptional, IsArray, IsIn } from "class-validator";
import { AttachmentDto } from "./attachment.dto";

export class CreateTaskDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: "MEDIUM" })
  @IsOptional()
  @IsIn(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
  priority?: string;

  @ApiProperty()
  @IsString()
  deadline!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiProperty()
  @IsString()
  teamId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsIn(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"])
  status?: string;

  @ApiProperty({ type: () => [AttachmentDto], required: false })
  @IsOptional()
  @IsArray()
  attachments?: Attachment[];
}
