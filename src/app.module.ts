import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LogsModule } from './logs/logs.module';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [LogsModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
