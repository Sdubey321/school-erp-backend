import { Module } from '@nestjs/common';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StudentsModule } from '../students/students.module';

@Module({
  imports: [PrismaModule, StudentsModule],
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TeachersService],
})
export class TeachersModule {}
