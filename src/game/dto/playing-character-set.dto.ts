import { ApiProperty } from '@nestjs/swagger';
import { PlayingCharacterDto } from './playing-character.dto';

export class PlayingCharacterSetDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  characterGroupId: number;
  @ApiProperty({ type: [PlayingCharacterDto] })
  playingCharacter: PlayingCharacterDto[];
}
