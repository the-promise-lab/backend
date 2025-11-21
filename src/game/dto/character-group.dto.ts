import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsPositive } from 'class-validator';

export class CharacterGroupDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'duo_hem_bang' })
  code: string;

  @ApiProperty({ example: '재난 속에서 서로를 의지하며 살아남아야 하는 헬스 광인들' })
  name: string;

  @ApiProperty({ example: 'duo_hem_bang.png' })
  groupSelectImage: string;

  @ApiProperty({ example: 10099 })
  deathEndActId: number;

  @ApiProperty({ example: 1 })
  prologActId: number;

  @ApiProperty({ example: '평범한 가족' })
  description: string;
}
