import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class PlayingCharacterDto {
  @ApiProperty({ example: 1, description: '플레이 중인 캐릭터 ID' })
  @IsInt()
  id: number;

  @ApiProperty({ example: 1, description: '플레이 중인 캐릭터 셋 ID' })
  @IsInt()
  playingCharacterSetId: number;

  @ApiProperty({ example: 1, description: '캐릭터 ID' })
  @IsInt()
  characterId: number;

  @ApiProperty({ example: 100, description: '현재 체력' })
  @IsInt()
  currentHp: number;

  @ApiProperty({ example: 50, description: '현재 정신력' })
  @IsInt()
  currentMental: number;
}
