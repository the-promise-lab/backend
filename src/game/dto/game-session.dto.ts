import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { InventoryDto } from './inventory.dto';
import { PlayingCharacterSetDto } from './playing-character-set.dto';

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
  @ApiProperty({ type: [InventoryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryDto)
  inventories: InventoryDto[];
}
