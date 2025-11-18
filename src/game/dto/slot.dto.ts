import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { ItemDto } from './item.dto';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class SlotDto {
  @ApiProperty({ example: 1, description: '슬롯 ID' })
  @IsInt()
  id: number;

  @ApiProperty({ example: 1, description: '인벤토리 ID', required: false })
  @IsInt()
  invId?: number;

  @ApiProperty({ type: ItemDto, description: '아이템 정보' })
  @ValidateNested()
  @Type(() => ItemDto)
  item: ItemDto;

  @ApiProperty({ example: 1, description: '수량' })
  @IsInt()
  quantity: number;
}