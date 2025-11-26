import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsString, ValidateNested } from 'class-validator';
import { SessionEventDto } from './session-event.dto';
import { Type } from 'class-transformer';

export class IntroResponseDto {
  @ApiProperty({ example: 'session-abc-123', description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ example: 1, description: 'Intro mode that was played' })
  @IsInt()
  introMode: number;

  @ApiProperty({
    type: [SessionEventDto],
    description: 'Intro events to render',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionEventDto)
  events: SessionEventDto[];
}
