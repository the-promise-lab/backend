import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { GameService } from './game.service';
import { AuthGuard } from '@nestjs/passport'; // 예시: JWT 인증 가드
import { SelectCharacterSetDto } from './dto/select-character-set.dto';
import { SubmitInventoryDto } from './dto/submit-inventory.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

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
    schema: {
      example: {
        id: 1,
        userId: 1,
        currentActId: null,
        createdAt: '2025-11-04T15:00:00.000Z',
        playingCharacterSet: {
          id: 1,
          gameSessionId: 1,
          characterGroupId: 1,
          playingCharacter: [
            {
              id: 1,
              playingCharacterSetId: 1,
              characterId: 1,
              currentHp: 100,
              currentSp: 50,
            },
          ],
        },
        inventories: [
          {
            id: 1,
            gameSessionId: 1,
            bagId: 1,
            slots: [
              {
                id: 1,
                invId: 1,
                itemId: 1,
                quantity: 1,
              },
            ],
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: '게임 세션을 찾을 수 없습니다.' })
  findGameSession(@Req() req) {
    return this.gameService.findGameSession(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @Post('session')
  @ApiOperation({ summary: '게임 세션 생성' })
  @ApiResponse({
    status: 201,
    description: '게임 세션 생성 성공',
    schema: {
      example: {
        id: 1,
        userId: 1,
        currentActId: null,
        createdAt: '2025-11-04T15:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: '이미 진행 중인 게임 세션이 존재합니다.',
  })
  createGameSession(@Req() req) {
    return this.gameService.createGameSession(req.user.id);
  }

  @Get('character-groups')
  @ApiOperation({ summary: '캐릭터 그룹 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '캐릭터 그룹 목록 조회 성공',
    schema: {
      example: [
        {
          id: 1,
          name: 'TFT',
        },
        {
          id: 2,
          name: '롤',
        },
      ],
    },
  })
  getCharacterGroups() {
    return this.gameService.getCharacterGroups();
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @Post('session/character-set')
  @ApiOperation({ summary: '캐릭터 셋 선택' })
  @ApiBody({ type: SelectCharacterSetDto })
  @ApiResponse({
    status: 201,
    description: '캐릭터 셋 선택 성공',
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
            currentHp: 100,
            currentSp: 50,
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: '리소스를 찾을 수 없습니다.' })
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
  @ApiOperation({ summary: '게임 설정 정보 조회' })
  @ApiResponse({
    status: 200,
    description: '게임 설정 정보 조회 성공',
    schema: {
      example: {
        bags: [
          {
            id: 1,
            name: '기본 가방',
          },
        ],
        items: [
          {
            id: 1,
            name: 'HP 물약',
          },
        ],
      },
    },
  })
  getSetupInfo() {
    return this.gameService.getSetupInfo();
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @Post('session/inventory')
  @ApiOperation({ summary: '인벤토리 제출' })
  @ApiBody({ type: SubmitInventoryDto })
  @ApiResponse({
    status: 201,
    description: '인벤토리 제출 성공',
    schema: {
      example: {
        id: 1,
        gameSessionId: 1,
        bagId: 1,
        slots: [
          {
            id: 1,
            invId: 1,
            itemId: 1,
            quantity: 1,
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: '게임 세션을 찾을 수 없습니다.' })
  submitInventory(@Req() req, @Body() submitInventoryDto: SubmitInventoryDto) {
    return this.gameService.submitInventory(req.user.id, submitInventoryDto);
  }
}
