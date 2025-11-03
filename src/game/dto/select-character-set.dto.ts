import { IsInt } from 'class-validator';

export class SelectCharacterSetDto {
  @IsInt()
  characterGroupId: number;
}