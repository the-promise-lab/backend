import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PlayingCharacterSetDto } from './playing-character-set.dto';
import { GameSessionInventoryDto } from './game-session-inventory.dto';
import { BagDto } from './bag.dto';

export class GameSessionDto {
  @ApiProperty({ example: 1, description: '게임 세션 ID' })
  @IsInt()
  id: number;

  @ApiProperty({ example: 1, description: '유저 ID' })
  @IsInt()
  userId: number;

  @ApiProperty({ type: () => BagDto, description: '가방 정보' })
  @ValidateNested()
  @Type(() => BagDto)
  bag: BagDto;

  @ApiProperty({ example: 10, description: '가방 사용량', nullable: true })
  @IsInt()
  @IsOptional()
  bagCapacityUsed: number | null;

  @ApiProperty({ description: '가방 확정 시각', nullable: true })
  @IsDate()
  @IsOptional()
  bagConfirmedAt: Date | null;

  @ApiProperty({
    example: 'IN_PROGRESS',
    description: '게임 세션 상태',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  status: string | null;

  @ApiProperty({ example: 100, description: '생존 점수' })
  @IsInt()
  lifePoint: number;

  @ApiProperty({ example: 1, description: '현재 날짜 ID', nullable: true })
  @IsInt()
  @IsOptional()
  currentDayId: number | null;

  @ApiProperty({ example: 1, description: '현재 액트 ID', nullable: true })
  @IsInt()
  @IsOptional()
  currentActId: number | null;

  @ApiProperty({ example: 1, description: '엔딩 ID', nullable: true })
  @IsInt()
  @IsOptional()
  endingId: number | null;

  @ApiProperty({ description: '게임 종료 시각', nullable: true })
  @IsDate()
  @IsOptional()
  endedAt: Date | null;

  @ApiProperty({ description: '생성 시각' })
  @IsDate()
  createdAt: Date;

  @ApiProperty({ description: '수정 시각' })
  @IsDate()
  updatedAt: Date;

  @ApiProperty({
    type: PlayingCharacterSetDto,
    nullable: true,
    description: '플레이 중인 캐릭터 셋',
  })
  @ValidateNested()
  @Type(() => PlayingCharacterSetDto)
  @IsOptional()
  playingCharacterSet: PlayingCharacterSetDto | null;
  @ApiProperty({
    type: [GameSessionInventoryDto],
    description: '게임 세션 인벤토리',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GameSessionInventoryDto)
  gameSessionInventory: GameSessionInventoryDto[];
}
