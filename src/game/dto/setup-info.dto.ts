import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { BagDto } from './bag.dto';
import { ItemDto } from './item.dto';

export class SetupInfoDto {
  @ApiProperty({ type: [BagDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BagDto)
  bags: BagDto[];

  @ApiProperty({ type: [ItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items: ItemDto[];
}
