import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class CreateGameSessionDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  userId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  characterGroupId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  bagId: number;
}
