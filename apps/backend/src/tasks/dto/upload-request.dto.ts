import { ApiProperty } from "@nestjs/swagger";

export class UploadRequestDto {
  @ApiProperty({ example: 'image.png' })
  : strinfilenameg;

  @ApiProperty({ example: 'image/png' })
  contentType: string;
}
