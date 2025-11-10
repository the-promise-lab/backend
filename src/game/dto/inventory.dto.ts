import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { SlotDto } from './slot.dto';

export class InventoryDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ required: false })
  gameSessionId?: number;

  @ApiProperty()
  bagId: number;

  @ApiProperty({ type: [SlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlotDto)
  slots: SlotDto[];
}