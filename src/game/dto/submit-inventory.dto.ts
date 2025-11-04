import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, ValidateNested } from 'class-validator';

class SlotDto {
  @ApiProperty({ example: 1, description: '아이템 ID' })
  @IsInt()
  itemId: number;

  @ApiProperty({ example: 1, description: '수량' })
  @IsInt()
  quantity: number;
}

export class SubmitInventoryDto {
  @ApiProperty({ example: 1, description: '가방 ID' })
  @IsInt()
  bagId: number;

  @ApiProperty({ type: [SlotDto], description: '인벤토리 슬롯 목록' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlotDto)
  slots: SlotDto[];
}