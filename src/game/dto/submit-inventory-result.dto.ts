import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { InventoryDto } from './inventory.dto';

export class SubmitInventoryResultDto {
  @ApiProperty({ type: [InventoryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryDto)
  inventories: InventoryDto[];
}