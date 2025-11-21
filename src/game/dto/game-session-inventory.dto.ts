import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class GameSessionInventoryDto {
  @ApiProperty()
  @IsInt()
  sessionId: number;

  @ApiProperty()
  @IsInt()
  itemId: number;

  @ApiProperty()
  @IsInt()
  quantity: number;
}
