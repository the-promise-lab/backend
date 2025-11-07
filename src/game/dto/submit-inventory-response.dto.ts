import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, ValidateNested } from 'class-validator';

class SlotResponseDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  invId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  itemId: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  quantity: number;
}

class InventoryResponseDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  gameSessionId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  bagId: number;

  @ApiProperty({ type: [SlotResponseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlotResponseDto)
  slots: SlotResponseDto[];
}

export class SubmitInventoryResponseDto {
  @ApiProperty({ type: [InventoryResponseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryResponseDto)
  inventories: InventoryResponseDto[];
}