import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

/**
 * PlayingCharacterStatusDto represents the current HP/Mental of a session character.
 */
export class PlayingCharacterStatusDto {
  @ApiProperty({ example: 'char_hem', description: '캐릭터 코드' })
  @IsString()
  characterCode: string;

  @ApiProperty({ example: 9, description: '캐릭터 ID' })
  @IsInt()
  characterId: number;

  @ApiProperty({ example: 95, description: '현재 HP' })
  @IsInt()
  currentHp: number;

  @ApiProperty({ example: 88, description: '현재 멘탈' })
  @IsInt()
  currentMental: number;
}
