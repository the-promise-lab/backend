import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

/**
 * SessionChoiceFallbackDto describes the default action when no valid item option exists.
 */
export class SessionChoiceFallbackDto {
  @ApiProperty({ example: 99, description: '선택지 ID' })
  @IsInt()
  choiceOptionId: number;

  @ApiProperty({ example: '아무것도 먹지 않는다', description: '후보 문구' })
  @IsString()
  text: string;
}
