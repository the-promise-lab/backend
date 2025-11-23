import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

/**
 * SessionActMetaDto encapsulates the current act metadata.
 */
export class SessionActMetaDto {
  @ApiProperty({ example: 10101, description: 'Act ID' })
  @IsInt()
  id: number;

  @ApiProperty({ example: 1, description: 'Act sequence number' })
  @IsInt()
  sequenceNumber: number;

  @ApiProperty({
    example: '대피소 첫 만남',
    description: 'Act 제목',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  title: string | null;
}
