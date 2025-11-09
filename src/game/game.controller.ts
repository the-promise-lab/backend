import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { GameService } from './game.service';
import { AuthGuard } from '@nestjs/passport'; // 예시: JWT 인증 가드
import { SelectCharacterSetDto } from './dto/select-character-set.dto';
import { SubmitInventoryDto } from './dto/submit-inventory.dto';
import { SubmitInventoryResponseDto } from './dto/submit-inventory-response.dto';
import { SelectCharacterSetResponseDto } from './dto/select-character-set-response.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CharacterGroupResponseDto } from './dto/character-group-response.dto';
import { SetupInfoResponseDto } from './dto/setup-info-response.dto';
import { GameSessionResponseDto } from './dto/game-session-response.dto';
import { CreateGameSessionResponseDto } from './dto/create-game-session-response.dto';

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
    type: GameSessionResponseDto,
  })
  @ApiResponse({ status: 404, description: '게임 세션을 찾을 수 없습니다.' })
  findGameSession(@Req() req): Promise<GameSessionResponseDto> {
    return this.gameService.findGameSession(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @Post('session')
  @ApiOperation({ summary: '게임 세션 생성' })
  @ApiResponse({
    status: 201,
    description: '게임 세션 생성 성공',
    type: CreateGameSessionResponseDto,
  })
  createGameSession(@Req() req): Promise<CreateGameSessionResponseDto> {
    return this.gameService.createGameSession(req.user.id);
  }

  @Get('character-groups')
  @ApiOperation({ summary: '캐릭터 그룹 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '캐릭터 그룹 목록 조회 성공',
    type: [CharacterGroupResponseDto],
  })
  getCharacterGroups(): Promise<CharacterGroupResponseDto[]> {
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
    type: SelectCharacterSetResponseDto,
    schema: {
      example: {
        id: 1,
        gameSessionId: 1,
        characterGroupId: 1,
        playingCharacter: [
          {
            id: 1,
            playingCharacterSetId: 1,
            characterId: 1,
            currentHp: 10,
            currentSp: 10,
          },
          {
            id: 2,
            playingCharacterSetId: 1,
            characterId: 2,
            currentHp: 6,
            currentSp: 20,
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: '리소스를 찾을 수 없습니다.' })
  selectCharacterSet(
    @Req() req,
    @Body() selectCharacterSetDto: SelectCharacterSetDto,
  ): Promise<SelectCharacterSetResponseDto> {
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
    type: SetupInfoResponseDto,
  })
  getSetupInfo(): Promise<SetupInfoResponseDto> {
    return this.gameService.getSetupInfo();
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @Post('session/inventory')
  @ApiOperation({ summary: '인벤토리 제출' })
  @ApiBody({
    type: SubmitInventoryDto,
    examples: {
      example1: {
        summary: '기본 인벤토리 제출',
        value: {
          bagId: 1,
          slots: [
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
    type: SubmitInventoryResponseDto,
    schema: {
      example: {
        inventories: [
          {
            id: 1,
            gameSessionId: 1,
            bagId: 1,
            slots: [
              { id: 1, invId: 1, itemId: 1, quantity: 3 },
              { id: 2, invId: 1, itemId: 10, quantity: 5 },
            ],
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: '게임 세션을 찾을 수 없습니다.' })
  submitInventory(
    @Req() req,
    @Body() submitInventoryDto: SubmitInventoryDto,
  ): Promise<SubmitInventoryResponseDto> {
    return this.gameService.submitInventory(req.user.id, submitInventoryDto);
  }
}
