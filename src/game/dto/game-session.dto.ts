import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { PlayingCharacterSetDto } from './playing-character-set.dto';
import { InventoryDto } from './inventory.dto';

export class GameSessionDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  userId: number;
  @ApiProperty({ nullable: true })
  currentActId: number | null;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty({ type: PlayingCharacterSetDto, nullable: true })
  @ValidateNested()
  @Type(() => PlayingCharacterSetDto)
  playingCharacterSet: PlayingCharacterSetDto | null;
  @ApiProperty({ type: InventoryDto, nullable: true })
  @ValidateNested()
  @Type(() => InventoryDto)
  inventory: InventoryDto | null;
}
