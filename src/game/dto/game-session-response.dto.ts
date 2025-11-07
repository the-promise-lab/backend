import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

class PlayingCharacterResponseDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  characterId: number;
  @ApiProperty()
  currentHp: number;
  @ApiProperty()
  currentSp: number;
}

class PlayingCharacterSetResponseDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  characterGroupId: number;
  @ApiProperty({ type: [PlayingCharacterResponseDto] })
  playingCharacter: PlayingCharacterResponseDto[];
}

class SlotResponseDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  itemId: number;
  @ApiProperty()
  quantity: number;
}

class InventoryResponseDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  bagId: number;
  @ApiProperty({ type: [SlotResponseDto] })
  slots: SlotResponseDto[];
}

export class GameSessionResponseDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  userId: number;
  @ApiProperty({ nullable: true })
  currentActId: number | null;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty({ type: PlayingCharacterSetResponseDto, nullable: true })
  @ValidateNested()
  @Type(() => PlayingCharacterSetResponseDto)
  playingCharacterSet: PlayingCharacterSetResponseDto | null;
  @ApiProperty({ type: [InventoryResponseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryResponseDto)
  inventories: InventoryResponseDto[];
}
