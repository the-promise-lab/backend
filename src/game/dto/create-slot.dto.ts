import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class SlotDto {
  @ApiProperty({ example: 1, description: '아이템 ID' })
  @IsInt()
  itemId: number;

  @ApiProperty({ example: 1, description: '수량' })
  @IsInt()
  quantity: number;
}
