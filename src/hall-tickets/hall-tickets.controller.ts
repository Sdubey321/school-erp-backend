import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { HallTicketsService } from './hall-tickets.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Hall Tickets')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('hall-tickets')
export class HallTicketsController {
  constructor(private readonly hallTicketsService: HallTicketsService) {}

  /** Admin/Class Teacher: Generate hall tickets for a class + exam */
  @Post('generate')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER')
  generate(
    @Body() dto: { examTypeId: string; classId: string; hallNo?: string },
  ) {
    return this.hallTicketsService.generateForClass(dto.examTypeId, dto.classId, dto.hallNo);
  }

  /** Admin: Get all hall tickets for an exam */
  @Get('exam/:examTypeId')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER')
  getByExam(@Param('examTypeId') examTypeId: string) {
    return this.hallTicketsService.getByExam(examTypeId);
  }

  /** Class Teacher: Get hall tickets for their class */
  @Get('exam/:examTypeId/class/:classId')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER')
  getByExamAndClass(
    @Param('examTypeId') examTypeId: string,
    @Param('classId') classId: string,
  ) {
    return this.hallTicketsService.getByExamAndClass(examTypeId, classId);
  }

  /** Student: Get own hall tickets */
  @Get('me')
  @Roles('STUDENT')
  getMyTickets(@CurrentUser('sub') userId: string) {
    return this.hallTicketsService.getByStudentUserId(userId);
  }

  /** Admin/Parent/Teacher: Get tickets for a specific student */
  @Get('student/:studentId')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT')
  getByStudent(@Param('studentId') studentId: string) {
    return this.hallTicketsService.getByStudent(studentId);
  }
}
