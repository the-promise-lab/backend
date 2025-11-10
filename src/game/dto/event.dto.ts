import { ApiProperty } from '@nestjs/swagger';
import { EventType } from '@prisma/client';

export class EventDto {
  @ApiProperty()
  id: bigint;

  @ApiProperty()
  actId: bigint;

  @ApiProperty({ enum: EventType })
  eventType: EventType;

  @ApiProperty()
  order: number;

  @ApiProperty({ required: false, type: 'number' })
  speakerId?: bigint;

  @ApiProperty()
  script: string;

  @ApiProperty()
  position: string;

  @ApiProperty()
  emotion: string;

  @ApiProperty()
  bgImage: string;
}
