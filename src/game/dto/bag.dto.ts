import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsPositive } from 'class-validator';

export class BagDto {
  @ApiProperty({ example: 1, description: '가방 ID' })
  @IsInt()
  id: number;

  @ApiProperty({ example: '기본 배낭', description: '가방 이름' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'bag_1', description: '가방 코드' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'bag.png', description: '가방 이미지' })
  @IsString()
  image: string;
  @ApiProperty({ example: 10, description: '가방 용량' })
  @IsInt()
  @IsPositive()
  capacity: number;

  @ApiProperty({ example: '기본 배낭 설명', description: '가방 설명' })
  @IsString()
  description: string;
}
