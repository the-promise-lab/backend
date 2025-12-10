import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { NextActRequestDto } from './dto/next-act-request.dto';
import { NextActResponseDto } from './dto/next-act-response.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { IntroRequestDto } from './dto/intro-request.dto';
import { IntroResponseDto } from './dto/intro-response.dto';
import { SessionChoiceOutcomeDto } from './dto/session-choice-outcome.dto';
import { SessionReportResponseDto } from './dto/session-report-response.dto';
import { AuthGuard } from '@nestjs/passport';
import { RankingResponseDto } from './dto/ranking-response.dto';
import { EndingCollectionResponseDto } from './dto/collection-response.dto';
import { HistoryResponseDto } from './dto/history-response.dto';

/**
 * SessionsController handles the story flow endpoints that begin after bag confirmation.
 */
@ApiTags('sessions')
@ApiExtraModels(SessionChoiceOutcomeDto)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @Post('intro')
  @ApiOperation({
    summary: 'Intro 이벤트 조회',
    description:
      '캐릭터 그룹과 introMode에 맞는 Simple/System 이벤트 시퀀스를 반환합니다.',
  })
  @ApiBody({ type: IntroRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Intro 이벤트 번들',
    type: IntroResponseDto,
  })
  playIntro(
    @Req() req: Request,
    @Body() introRequestDto: IntroRequestDto,
  ): Promise<IntroResponseDto> {
    return this.sessionsService.playIntro({
      userId: Number((req.user as { id: string }).id),
      payload: introRequestDto,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @Post('active/next')
  @ApiOperation({
    summary: 'Act 진행',
    description:
      '현재 세션 기준으로 다음 Act를 진행합니다. 직전 Act 결과를 보고한 뒤, 다음 Act 이벤트 번들을 반환합니다. 빈 객체를 보내면 현재 Act 번들을 불러옵니다.',
  })
  @ApiBody({ type: NextActRequestDto })
  @ApiResponse({
    status: 200,
    description: '다음 Act 이벤트 번들',
    type: NextActResponseDto,
  })
  executeNextAct(
    @Req() req: Request,
    @Body() nextActRequestDto: NextActRequestDto,
  ): Promise<NextActResponseDto> {
    return this.sessionsService.executeNextAct({
      userId: Number((req.user as { id: string }).id),
      payload: nextActRequestDto,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @Get(':sessionId/report')
  @ApiOperation({
    summary: '결과 보고서 조회',
    description: 'C001 결과 리포트 탭 데이터를 반환합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '결과 보고서',
    type: SessionReportResponseDto,
  })
  getSessionReport(
    @Req() req: Request,
    @Param('sessionId') sessionId: string,
  ): Promise<SessionReportResponseDto> {
    return this.sessionsService.getSessionReport({
      userId: Number((req.user as { id: string }).id),
      sessionId: Number(sessionId),
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @Get('ranking/summary')
  @ApiOperation({
    summary: '랭킹 및 결과 요약 조회',
    description:
      '사용자의 누적 랭킹 정보와 캐릭터 그룹별 최고 기록을 반환합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '랭킹 및 결과 요약',
    type: RankingResponseDto,
  })
  getRankingSummary(@Req() req: Request): Promise<RankingResponseDto> {
    return this.sessionsService.getRankingSummary(
      Number((req.user as { id: string }).id),
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @Get('collections')
  @ApiOperation({
    summary: '엔딩 수집 현황 조회',
    description: '캐릭터 그룹별 엔딩 수집 리스트를 반환합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '엔딩 수집 리스트',
    type: EndingCollectionResponseDto,
  })
  getEndingCollection(
    @Req() req: Request,
  ): Promise<EndingCollectionResponseDto> {
    return this.sessionsService.getEndingCollection(
      Number((req.user as { id: string }).id),
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @Get('history')
  @ApiOperation({
    summary: '게임 히스토리 조회',
    description: '사용자의 게임 플레이 히스토리 목록을 반환합니다.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: '페이지 번호',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '페이지 당 개수 (기본값: 100 - 전체 조회에 가깝게 설정됨)',
    example: 100,
  })
  @ApiResponse({
    status: 200,
    description: '게임 히스토리 목록',
    type: HistoryResponseDto,
  })
  getHistory(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 100,
  ): Promise<HistoryResponseDto> {
    return this.sessionsService.getHistory(
      Number((req.user as { id: string }).id),
      Number(page),
      Number(limit),
    );
  }
}
