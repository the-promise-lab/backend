import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

/**
 * SessionDayMetaDto supplies current day metadata to the client.
 */
export class SessionDayMetaDto {
  @ApiProperty({ example: 1, description: 'Day ID' })
  @IsInt()
  id: number;

  @ApiProperty({ example: 1, description: 'Day Number' })
  @IsInt()
  number: number;
}
