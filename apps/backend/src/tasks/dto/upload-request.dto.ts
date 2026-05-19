import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class UploadRequestDto {
  @ApiProperty()
  @IsString()
  filename!: string;

  @ApiProperty()
  @IsString()
  contentType!: string;
}
