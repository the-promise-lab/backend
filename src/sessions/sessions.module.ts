import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GameModule } from '../game/game.module';
import { EventAssembler } from './utils/event-assembler';
import { ChoiceResultMapper } from './utils/choice-result-mapper';
import { SessionStateMachine } from './utils/session-state-machine';

@Module({
  imports: [PrismaModule, GameModule],
  controllers: [SessionsController],
  providers: [
    SessionsService,
    EventAssembler,
    ChoiceResultMapper,
    SessionStateMachine,
  ],
})
export class SessionsModule {}
