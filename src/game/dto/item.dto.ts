import { ApiProperty } from '@nestjs/swagger';

export class ItemDto {
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
  storeSectionId: number;
  @ApiProperty()
  isVisable: boolean;
  @ApiProperty()
  itemCategoryId: number;
  @ApiProperty()
  necessity: number;
}
