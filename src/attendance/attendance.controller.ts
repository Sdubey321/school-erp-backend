import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('bulk')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER')
  markBulk(@Body() dto: BulkAttendanceDto, @CurrentUser('sub') userId: string) {
    return this.attendanceService.markBulk(dto, userId);
  }

  @Get('section/:sectionId')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER')
  getBySection(@Param('sectionId') sectionId: string, @Query('date') date: string) {
    return this.attendanceService.getBySection(sectionId, date || new Date().toISOString().split('T')[0]);
  }

  @Get('student/:studentId')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STUDENT')
  getStudentAttendance(
    @Param('studentId') studentId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    const now = new Date();
    return this.attendanceService.getStudentAttendance(
      studentId,
      +month || now.getMonth() + 1,
      +year || now.getFullYear(),
    );
  }

  @Get('section/:sectionId/report')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER')
  getSectionReport(
    @Param('sectionId') sectionId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    const now = new Date();
    return this.attendanceService.getSectionReport(
      sectionId,
      +month || now.getMonth() + 1,
      +year || now.getFullYear(),
    );
  }

  @Get('school-summary')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  getSchoolSummary(@CurrentUser('schoolId') schoolId: string, @Query('date') date: string) {
    return this.attendanceService.getSchoolSummary(
      schoolId,
      date || new Date().toISOString().split('T')[0],
    );
  }
}
