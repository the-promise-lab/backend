import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

class BagResponseDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  name: string;
  @ApiProperty()
  image: string;
  @ApiProperty()
  capacity: number;
}

class ItemResponseDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  name: string;
  @ApiProperty()
  image: string;
  @ApiProperty()
  capacityCost: number;
  @ApiProperty()
  isConsumable: boolean;
  @ApiProperty()
  storeSection: string;
  @ApiProperty()
  isVisable: boolean;
  @ApiProperty()
  itemCategoryId: number;
  @ApiProperty()
  necessity: number;
}

export class SetupInfoResponseDto {
  @ApiProperty({ type: [BagResponseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BagResponseDto)
  bags: BagResponseDto[];

  @ApiProperty({ type: [ItemResponseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemResponseDto)
  items: ItemResponseDto[];
}
