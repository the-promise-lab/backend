import { ApiProperty } from '@nestjs/swagger';
import { event_eventType } from '@prisma/client';
import {
  IsInt,
  IsEnum,
  IsString,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class EventDto {
  @ApiProperty({ example: 1, description: '이벤트 ID' })
  @IsInt()
  id: number;

  @ApiProperty({
    enum: event_eventType,
    example: 'Simple',
    description: '이벤트 타입',
  })
  @IsEnum(event_eventType)
  eventType: event_eventType;

  @ApiProperty({ example: 2, description: '다음 이벤트 ID', nullable: true })
  @IsInt()
  @IsOptional()
  nextEventId: number | null;

  @ApiProperty({
    example: 'bg.png',
    description: '배경 이미지',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  bgImage: string | null;

  @ApiProperty({ example: 'fade_in', description: '장면 효과', nullable: true })
  @IsString()
  @IsOptional()
  sceneEffect: string | null;

  @ApiProperty({ example: 'bgm.mp3', description: '배경 음악', nullable: true })
  @IsString()
  @IsOptional()
  bgm: string | null;

  @ApiProperty({ example: 100, description: '배경 음악 볼륨', nullable: true })
  @IsInt()
  @IsOptional()
  bgmVolume: number | null;

  @ApiProperty({ example: 'se.mp3', description: '효과음', nullable: true })
  @IsString()
  @IsOptional()
  se: string | null;

  @ApiProperty({ example: 100, description: '효과음 볼륨', nullable: true })
  @IsInt()
  @IsOptional()
  seVolume: number | null;

  @ApiProperty({
    example: false,
    description: '효과음 반복 여부',
    nullable: true,
  })
  @IsBoolean()
  @IsOptional()
  seLoop: boolean | null;
}
