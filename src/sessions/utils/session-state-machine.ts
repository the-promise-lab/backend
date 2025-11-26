import { Injectable } from '@nestjs/common';
import { SessionFlowStatus } from '../dto/session-flow-status.enum';
import { SessionChoiceResultType } from '../dto/session-choice-result-type.enum';

export interface DetermineNextStatusParams {
  readonly currentStatus: SessionFlowStatus;
  readonly resultType?: SessionChoiceResultType;
}

/**
 * SessionStateMachine centralizes status transitions for story progression.
 */
@Injectable()
export class SessionStateMachine {
  determineNextStatus(params: DetermineNextStatusParams): SessionFlowStatus {
    if (!params.resultType) {
      return params.currentStatus;
    }
    switch (params.resultType) {
      case SessionChoiceResultType.DAY_END:
        return SessionFlowStatus.DAY_END;
      case SessionChoiceResultType.GAME_END:
        return SessionFlowStatus.GAME_END;
      case SessionChoiceResultType.GAME_OVER:
        return SessionFlowStatus.GAME_OVER;
      case SessionChoiceResultType.SUDDEN_DEATH:
        return SessionFlowStatus.SUDDEN_DEATH;
      default:
        return SessionFlowStatus.IN_PROGRESS;
    }
  }
}
