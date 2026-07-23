import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('attendance')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  getAttendanceReport(
    @Request() req,
    @Query('classId') classId?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.reportsService.attendanceReport(
      req.user.schoolId,
      classId,
      month ? Number(month) : undefined,
      year ? Number(year) : undefined,
    );
  }

  @Get('fees')
  @Roles('SCHOOL_ADMIN', 'ACCOUNTANT')
  getFeeReport(@Request() req) {
    return this.reportsService.feeReport(req.user.schoolId);
  }

  @Get('academic')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  getAcademicReport(
    @Request() req,
    @Query('examTypeId') examTypeId?: string,
    @Query('classId') classId?: string,
  ) {
    return this.reportsService.academicReport(req.user.schoolId, examTypeId, classId);
  }
}
