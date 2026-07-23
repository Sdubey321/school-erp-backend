import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SalaryService } from './salary.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Salary')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('salary')
export class SalaryController {
  constructor(private readonly salaryService: SalaryService) {}

  /** Admin: Get all teachers with salary status for a month */
  @Get('payroll')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
  getPayroll(
    @CurrentUser('schoolId') schoolId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const now = new Date();
    return this.salaryService.getAllTeachersSalary(
      schoolId,
      parseInt(month) || now.getMonth() + 1,
      parseInt(year) || now.getFullYear(),
    );
  }

  /** Admin: Get payroll stats for a month */
  @Get('stats')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
  getStats(
    @CurrentUser('schoolId') schoolId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const now = new Date();
    return this.salaryService.getPayrollStats(
      schoolId,
      parseInt(month) || now.getMonth() + 1,
      parseInt(year) || now.getFullYear(),
    );
  }

  /** Admin: Bulk generate payroll for a month */
  @Post('generate')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
  generate(
    @CurrentUser('schoolId') schoolId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const now = new Date();
    return this.salaryService.generatePayroll(
      schoolId,
      parseInt(month) || now.getMonth() + 1,
      parseInt(year) || now.getFullYear(),
    );
  }

  /** Admin/Accountant: Create or update a salary record */
  @Post('record')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
  upsertRecord(@Body() dto: any) {
    return this.salaryService.upsertRecord(dto);
  }

  /** Admin/Accountant: Mark a salary as paid */
  @Patch(':id/mark-paid')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
  markPaid(@Param('id') id: string) {
    return this.salaryService.markPaid(id);
  }

  /** Admin: Get salary history for a specific teacher */
  @Get('teacher/:teacherId/history')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
  getTeacherHistory(@Param('teacherId') teacherId: string) {
    return this.salaryService.getTeacherHistory(teacherId);
  }

  /** Admin: Get slip data for PDF */
  @Get(':id/slip')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'TEACHER')
  getSlipData(@Param('id') id: string) {
    return this.salaryService.getSlipData(id);
  }

  /** Teacher: View own salary history */
  @Get('me/history')
  @Roles('TEACHER')
  getMyHistory(@CurrentUser('sub') userId: string) {
    return this.salaryService.getMyHistory(userId);
  }
}
