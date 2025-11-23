import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { AuthGuard } from '@nestjs/passport';
import { NextActRequestDto } from './dto/next-act-request.dto';
import { NextActResponseDto } from './dto/next-act-response.dto';
import { SessionReportDto } from './dto/session-report.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';

/**
 * SessionsController handles the story flow endpoints that begin after bag confirmation.
 */
@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @Post('active/next')
  @ApiOperation({
    summary: 'Act 진행',
    description:
      '현재 활성화된 세션의 다음 Act를 조회하거나, 직전 Act 결과를 보고 후 다음 Act를 가져옵니다.',
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
      userId: Number((req.user as { id: number }).id),
      payload: nextActRequestDto,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @Get(':sessionId/report')
  @ApiOperation({
    summary: '세션 결과 보고서 조회',
    description:
      '세션이 종료된 이후 최종 스탯, 인벤토리, 선택 히스토리를 제공합니다.',
  })
  @ApiParam({ name: 'sessionId', type: Number, description: '세션 ID' })
  @ApiResponse({
    status: 200,
    description: '세션 결과 보고서',
    type: SessionReportDto,
  })
  getSessionReport(
    @Req() req: Request,
    @Param('sessionId') sessionId: string,
  ): Promise<SessionReportDto> {
    return this.sessionsService.getSessionReport(
      Number(sessionId),
      Number((req.user as { id: number }).id),
    );
  }
}
