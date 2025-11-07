import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { PlayingCharacterDto } from './playing-character.dto';

export class SelectCharacterSetResponseDto {
  @ApiProperty({ example: 1, description: '플레이 중인 캐릭터 셋 ID' })
  @IsInt()
  id: number;

  @ApiProperty({ example: 1, description: '게임 세션 ID' })
  @IsInt()
  gameSessionId: number;

  @ApiProperty({ example: 1, description: '캐릭터 그룹 ID' })
  @IsInt()
  characterGroupId: number;

  @ApiProperty({ type: [PlayingCharacterDto] })
  playingCharacter: PlayingCharacterDto[];
}
