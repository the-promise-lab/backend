import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { GameService } from './game.service';
import { AuthGuard } from '@nestjs/passport'; // 예시: JWT 인증 가드
import { SelectCharacterSetDto } from './dto/select-character-set.dto';
import { SubmitGameSessionInventoryDto } from './dto/submit-game-session-inventory.dto';
import { SelectCharacterSetResultDto } from './dto/select-character-set-result.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CharacterGroupDto } from './dto/character-group.dto';
import { SetupInfoDto } from './dto/setup-info.dto';
import { GameSessionDto } from './dto/game-session.dto';
import { CreateGameSessionDto } from './dto/create-game-session.dto';

@ApiTags('game')
@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @Get('session')
  @ApiOperation({ summary: '게임 세션 조회' })
  @ApiResponse({
    status: 200,
    description: '게임 세션 조회 성공',
    type: GameSessionDto,
  })
  @ApiResponse({ status: 404, description: '게임 세션을 찾을 수 없습니다.' })
  findGameSession(@Req() req): Promise<GameSessionDto> {
    return this.gameService.findGameSession(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @Post('session')
  @ApiOperation({ summary: '게임 세션 생성' })
  @ApiResponse({
    status: 201,
    description: '게임 세션 생성 성공',
    type: CreateGameSessionDto,
  })
  createGameSession(@Req() req): Promise<CreateGameSessionDto> {
    return this.gameService.createGameSession(req.user.id);
  }

  @Get('character-groups')
  @ApiOperation({ summary: '캐릭터 그룹 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '캐릭터 그룹 목록 조회 성공',
    type: [CharacterGroupDto],
  })
  getCharacterGroups(): Promise<CharacterGroupDto[]> {
    return this.gameService.getCharacterGroups();
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @Post('session/character-set')
  @ApiOperation({ summary: '캐릭터 셋 선택' })
  @ApiBody({
    type: SelectCharacterSetDto,
    examples: {
      example1: {
        summary: '헬스 광인들 선택',
        value: { characterGroupId: 1 },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '캐릭터 셋 선택 성공',
    type: SelectCharacterSetResultDto,
  })
  @ApiResponse({ status: 404, description: '리소스를 찾을 수 없습니다.' })
  selectCharacterSet(
    @Req() req,
    @Body() selectCharacterSetDto: SelectCharacterSetDto,
  ): Promise<SelectCharacterSetResultDto> {
    return this.gameService.selectCharacterSet(
      req.user.id,
      selectCharacterSetDto,
    );
  }

  @Get('setup-info')
  @ApiOperation({ summary: '게임 설정 정보 조회' })
  @ApiResponse({
    status: 200,
    description: '게임 설정 정보 조회 성공',
    type: SetupInfoDto,
  })
  getSetupInfo(): Promise<SetupInfoDto> {
    return this.gameService.getSetupInfo();
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @Post('session/inventory')
  @ApiOperation({ summary: '인벤토리 제출' })
  @ApiBody({
    type: SubmitGameSessionInventoryDto,
    examples: {
      example1: {
        summary: '기본 인벤토리 제출',
        value: {
          bagId: 1,
          items: [
            { itemId: 1, quantity: 3 },
            { itemId: 10, quantity: 5 },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '인벤토리 제출 성공',
    type: GameSessionDto,
  })
  @ApiResponse({ status: 404, description: '게임 세션을 찾을 수 없습니다.' })
  submitGameSessionInventory(
    @Req() req,
    @Body() submitGameSessionInventoryDto: SubmitGameSessionInventoryDto,
  ) {
    return this.gameService.submitGameSessionInventory(
      req.user.id,
      submitGameSessionInventoryDto,
    );
  }
}
