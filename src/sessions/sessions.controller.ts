import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
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
} from '@nestjs/swagger';
import { Request } from 'express';
import { IntroRequestDto } from './dto/intro-request.dto';
import { IntroResponseDto } from './dto/intro-response.dto';
import { SessionChoiceOutcomeDto } from './dto/session-choice-outcome.dto';
import { SessionReportQueryDto } from './dto/session-report-query.dto';
import { SessionReportResponseDto } from './dto/session-report-response.dto';
import { AuthGuard } from '@nestjs/passport';

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
    @Query() query: SessionReportQueryDto,
  ): Promise<SessionReportResponseDto> {
    return this.sessionsService.getSessionReport({
      userId: Number((req.user as { id: string }).id),
      sessionId: Number(sessionId),
      tab: query.tab,
      includeInventory: query.includeInventory,
    });
  }
}
