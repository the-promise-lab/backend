import { ApiProperty } from '@nestjs/swagger';

export class CreateGameSessionDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ example: null, nullable: true })
  currentActId: number | null;

  @ApiProperty()
  createdAt: Date;
}
