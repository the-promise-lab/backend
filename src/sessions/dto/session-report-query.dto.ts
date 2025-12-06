import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { SessionReportTab } from './session-report-tab.enum';

/**
 * SessionReportQueryDto defines query parameters for result report retrieval.
 */
export class SessionReportQueryDto {
  @ApiPropertyOptional({
    enum: SessionReportTab,
    description: 'Report tab to fetch. Defaults to result.',
    default: SessionReportTab.RESULT,
  })
  @IsEnum(SessionReportTab)
  @IsOptional()
  tab?: SessionReportTab = SessionReportTab.RESULT;

  @ApiPropertyOptional({
    description: 'Include inventory details for result tab.',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  includeInventory?: boolean = true;
}
