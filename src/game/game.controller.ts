import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { GameService } from './game.service';
import { AuthGuard } from '@nestjs/passport'; // 예시: JWT 인증 가드
import { SelectCharacterSetDto } from './dto/select-character-set.dto';
import { SubmitInventoryDto } from './dto/submit-inventory.dto';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('session')
  findGameSession(@Req() req) {
    return this.gameService.findGameSession(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('session')
  createGameSession(@Req() req) {
    return this.gameService.createGameSession(req.user.id);
  }

  @Get('character-groups')
  getCharacterGroups() {
    return this.gameService.getCharacterGroups();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('session/character-set')
  selectCharacterSet(
    @Req() req,
    @Body() selectCharacterSetDto: SelectCharacterSetDto,
  ) {
    return this.gameService.selectCharacterSet(
      req.user.id,
      selectCharacterSetDto,
    );
  }

  @Get('setup-info')
  getSetupInfo() {
    return this.gameService.getSetupInfo();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('session/inventory')
  submitInventory(@Req() req, @Body() submitInventoryDto: SubmitInventoryDto) {
    return this.gameService.submitInventory(req.user.id, submitInventoryDto);
  }
}
