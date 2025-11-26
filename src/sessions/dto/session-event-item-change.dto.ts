import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

/**
 * SessionEventItemChangeDto reports inventory adjustments during an event.
 */
export class SessionEventItemChangeDto {
  @ApiProperty({ example: 97, description: '아이템 ID' })
  @IsInt()
  itemId: number;

  @ApiProperty({
    example: '[형빈의 리더십]',
    description: '아이템 이름',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  itemName: string | null;

  @ApiProperty({ example: 1, description: '변동 수량' })
  @IsInt()
  quantityChange: number;

  @ApiProperty({ example: 1, description: '변경 후 총량', nullable: true })
  @IsInt()
  @IsOptional()
  newQuantity: number | null;
}
