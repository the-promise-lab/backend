import { ApiProperty } from '@nestjs/swagger';
import { IsInt, ValidateNested, IsArray, IsOptional } from 'class-validator';
import { PlayingCharacterDto } from './playing-character.dto';
import { Type } from 'class-transformer';

export class SelectCharacterSetResultDto {
  @ApiProperty({ example: 1, description: '플레이 중인 캐릭터 셋 ID' })
  @IsInt()
  id: number;

  @ApiProperty({ example: 1, description: '게임 세션 ID' })
  @IsInt()
  gameSessionId: number;

  @ApiProperty({ example: 1, description: '캐릭터 그룹 ID', nullable: true })
  @IsInt()
  @IsOptional()
  characterGroupId: number | null;

  @ApiProperty({
    type: [PlayingCharacterDto],
    description: '플레이 중인 캐릭터 목록',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlayingCharacterDto)
  playingCharacter: PlayingCharacterDto[];
}
