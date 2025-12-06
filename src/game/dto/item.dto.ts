import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class ItemDto {
  @ApiProperty({ example: 1, description: '아이템 ID' })
  @IsInt()
  id: number;

  @ApiProperty({ example: '생수', description: '아이템 이름' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'item_water.png',
    description: '아이템 이미지',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  image: string | null;

  @ApiProperty({ example: 1, description: '가방 차지 용량' })
  @IsInt()
  capacityCost: number;

  @ApiProperty({
    example: true,
    description: '소모성 아이템 여부',
    nullable: true,
  })
  @IsBoolean()
  @IsOptional()
  isConsumable: boolean | null;

  @ApiProperty({ example: 1, description: '상점 섹션 ID', nullable: true })
  @IsInt()
  @IsOptional()
  storeSectionId: number | null;

  @ApiProperty({
    example: true,
    description: '가방에서 보이는지 여부',
    nullable: true,
  })
  @IsBoolean()
  @IsOptional()
  isVisable: boolean | null;

  @ApiProperty({ example: 0.5, description: 'X 좌표', nullable: true })
  @IsNumber()
  @IsOptional()
  positionX: number | null;

  @ApiProperty({ example: 0.5, description: 'Y 좌표', nullable: true })
  @IsNumber()
  @IsOptional()
  positionY: number | null;
}
