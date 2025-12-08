import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GameSessionLifecycleService } from './services/game-session-lifecycle.service';
import { ObjectStorageService } from './services/object-storage.service';
import { GameResourceService } from './services/game-resource.service';

@Module({
  imports: [PrismaModule],
  controllers: [GameController],
  providers: [
    GameService,
    GameSessionLifecycleService,
    ObjectStorageService,
    GameResourceService,
  ],
  exports: [GameService, GameSessionLifecycleService],
})
export class GameModule {}
