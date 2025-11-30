import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * SessionChoiceOptionDto represents a selectable choice entry.
 */
export class SessionChoiceOptionDto {
  @ApiProperty({ example: 1, description: '선택지 ID' })
  @IsInt()
  choiceOptionId: number;

  @ApiProperty({ example: '...일단 들어보자.', description: '선택지 문구' })
  @IsString()
  text: string;

  @ApiProperty({
    example: 2,
    description: '요구 아이템 카테고리',
    nullable: true,
  })
  @IsInt()
  @IsOptional()
  itemCategoryId: number | null;

  @ApiProperty({ example: 10, description: '사용될 아이템 ID', nullable: true })
  @IsInt()
  @IsOptional()
  itemId: number | null;

  @ApiProperty({
    example: '생수',
    description: '아이템 이름',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  itemName: string | null;

  @ApiProperty({ example: 1, description: '소모 수량', nullable: true })
  @IsInt()
  @IsOptional()
  quantity: number | null;

  @ApiProperty({ example: true, description: '선택 가능 여부' })
  @IsBoolean()
  isSelectable: boolean;
}
