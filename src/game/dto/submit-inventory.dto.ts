import { Type } from 'class-transformer';
import { IsArray, IsInt, ValidateNested } from 'class-validator';

class SlotDto {
  @IsInt()
  itemId: number;

  @IsInt()
  quantity: number;
}

export class SubmitInventoryDto {
  @IsInt()
  bagId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlotDto)
  slots: SlotDto[];
}