import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class IntroRequestDto {
  @ApiProperty({
    example: 1,
    description: 'Intro mode to play (1: pre-bag, 2: bag waiting, 3: prologue)',
  })
  @IsInt()
  @Min(1)
  introMode: number;
}
