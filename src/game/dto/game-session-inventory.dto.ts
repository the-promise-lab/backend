import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class GameSessionInventoryDto {
  @ApiProperty({ example: 1, description: '게임 세션 ID' })
  @IsInt()
  sessionId: number;

  @ApiProperty({ example: 1, description: '아이템 ID' })
  @IsInt()
  itemId: number;

  @ApiProperty({ example: 1, description: '수량' })
  @IsInt()
  quantity: number;
}
