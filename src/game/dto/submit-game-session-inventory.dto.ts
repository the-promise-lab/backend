import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, ValidateNested } from 'class-validator';

class GameSessionInventoryItemDto {
  @ApiProperty()
  @IsInt()
  itemId: number;

  @ApiProperty()
  @IsInt()
  quantity: number;
}

export class SubmitGameSessionInventoryDto {
  @ApiProperty()
  @IsInt()
  bagId: number;
  
  @ApiProperty({ type: [GameSessionInventoryItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GameSessionInventoryItemDto)
  items: GameSessionInventoryItemDto[];
}
