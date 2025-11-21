import { ApiProperty } from '@nestjs/swagger';
import { PlayingCharacterDto } from './playing-character.dto';

export class PlayingCharacterSetDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  gameSessionId: number;
  @ApiProperty({ nullable: true })
  characterGroupId: number | null;
  @ApiProperty({ type: [PlayingCharacterDto] })
  playingCharacter: PlayingCharacterDto[];
}
