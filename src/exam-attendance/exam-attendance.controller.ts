import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ExamAttendanceService } from './exam-attendance.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Exam Attendance')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('exam-attendance')
export class ExamAttendanceController {
  constructor(private readonly examAttendanceService: ExamAttendanceService) {}

  /** Teacher/Admin: Mark exam attendance for a single student */
  @Post('mark')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER')
  mark(@Body() dto: any, @CurrentUser('sub') userId: string) {
    return this.examAttendanceService.markAttendance({ ...dto, markedById: userId });
  }

  /** Teacher/Admin: Bulk mark exam attendance for a class */
  @Post('mark-bulk')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER')
  markBulk(
    @Body() dto: {
      examTypeId: string;
      subjectId: string;
      date: string;
      records: { studentId: string; isPresent: boolean }[];
    },
    @CurrentUser('sub') userId: string,
  ) {
    return this.examAttendanceService.markBulk(
      dto.examTypeId,
      dto.subjectId,
      dto.date,
      dto.records,
      userId,
    );
  }

  /** Get class roster with attendance status for a subject */
  @Get('roster')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER')
  getRoster(
    @Query('examTypeId') examTypeId: string,
    @Query('classId') classId: string,
    @Query('subjectId') subjectId: string,
  ) {
    return this.examAttendanceService.getClassRoster(examTypeId, classId, subjectId);
  }

  /** Get exam attendance for exam+class */
  @Get('exam/:examTypeId/class/:classId')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER')
  getByExamAndClass(
    @Param('examTypeId') examTypeId: string,
    @Param('classId') classId: string,
  ) {
    return this.examAttendanceService.getByExamAndClass(examTypeId, classId);
  }

  /** Student: Get own exam attendance */
  @Get('student/:studentId')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  getByStudent(
    @Param('studentId') studentId: string,
    @Query('examTypeId') examTypeId?: string,
  ) {
    return this.examAttendanceService.getByStudent(studentId, examTypeId);
  }
}
