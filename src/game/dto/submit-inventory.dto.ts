import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, ValidateNested } from 'class-validator';
import { SlotDto } from './create-slot.dto';

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