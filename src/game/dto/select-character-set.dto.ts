import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class SelectCharacterSetDto {
  @ApiProperty({ example: 1, description: '캐릭터 그룹 ID' })
  @IsInt()
  characterGroupId: number;
}