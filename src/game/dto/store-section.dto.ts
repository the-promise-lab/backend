import { ApiProperty } from '@nestjs/swagger';
import { ItemDto } from './item.dto';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, ValidateNested } from 'class-validator';

export class StoreSectionDto {
  @ApiProperty({ example: 1, description: '상점 섹션 ID' })
  @IsInt()
  id: number;

  @ApiProperty({ example: 'GroupGrocery', description: '상점 섹션 코드' })
  @IsString()
  code: string;

  @ApiProperty({ example: '식료품', description: '상점 섹션 이름' })
  @IsString()
  displayName: string;

  @ApiProperty({ type: [ItemDto], description: '아이템 목록' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items: ItemDto[];
}
