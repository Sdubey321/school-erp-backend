import { Module } from '@nestjs/common';
import { HallTicketsController } from './hall-tickets.controller';
import { HallTicketsService } from './hall-tickets.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HallTicketsController],
  providers: [HallTicketsService],
  exports: [HallTicketsService],
})
export class HallTicketsModule {}
