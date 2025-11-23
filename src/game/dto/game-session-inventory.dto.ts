import { ApiProperty } from '@nestjs/swagger';
import { IsInt, ValidateNested } from 'class-validator';
import { ItemDto } from './item.dto';
import { Type } from 'class-transformer';

export class GameSessionInventoryDto {
  @ApiProperty({ example: 1, description: '게임 세션 ID' })
  @IsInt()
  sessionId: number;

  @ApiProperty({ type: () => ItemDto, description: '아이템 정보' })
  @ValidateNested()
  @Type(() => ItemDto)
  item: ItemDto;

  @ApiProperty({ example: 1, description: '수량' })
  @IsInt()
  quantity: number;
}
