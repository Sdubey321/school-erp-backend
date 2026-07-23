import { Module } from '@nestjs/common';
import { ExamAttendanceController } from './exam-attendance.controller';
import { ExamAttendanceService } from './exam-attendance.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExamAttendanceController],
  providers: [ExamAttendanceService],
  exports: [ExamAttendanceService],
})
export class ExamAttendanceModule {}
