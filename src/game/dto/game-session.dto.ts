import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { PlayingCharacterSetDto } from './playing-character-set.dto';
import { GameSessionInventoryDto } from './game-session-inventory.dto';

export class GameSessionDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  userId: number;
  @ApiProperty()
  bagId: number;
  @ApiProperty({ nullable: true })
  bagCapacityUsed: number | null;
  @ApiProperty({ nullable: true })
  bagConfirmedAt: Date | null;
  @ApiProperty({ nullable: true })
  status: string | null;
  @ApiProperty()
  lifePoint: number;
  @ApiProperty({ nullable: true })
  currentDayId: number | null;
  @ApiProperty({ nullable: true })
  currentActId: number | null;
  @ApiProperty({ nullable: true })
  endingId: number | null;
  @ApiProperty({ nullable: true })
  endedAt: Date | null;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;
  @ApiProperty({ type: PlayingCharacterSetDto, nullable: true })
  @ValidateNested()
  @Type(() => PlayingCharacterSetDto)
  playingCharacterSet: PlayingCharacterSetDto | null;
  @ApiProperty({ type: [GameSessionInventoryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GameSessionInventoryDto)
  gameSessionInventory: GameSessionInventoryDto[];
}
