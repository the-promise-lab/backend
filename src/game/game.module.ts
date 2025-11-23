import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GameSessionLifecycleService } from './services/game-session-lifecycle.service';

@Module({
  imports: [PrismaModule],
  controllers: [GameController],
  providers: [GameService, GameSessionLifecycleService],
  exports: [GameService, GameSessionLifecycleService],
})
export class GameModule {}
