import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { FeesService } from './fees.service';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { CreateFeeInvoiceDto } from './dto/create-fee-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Fees')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('fees')
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @Post('structures')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT')
  createStructure(@Body() dto: CreateFeeStructureDto) {
    return this.feesService.createStructure(dto);
  }

  @Get('structures')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT', 'TEACHER')
  getStructures(@CurrentUser('schoolId') schoolId: string) {
    return this.feesService.getStructures(schoolId);
  }

  @Post('invoices')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT')
  createInvoice(@Body() dto: CreateFeeInvoiceDto) {
    return this.feesService.createInvoice(dto);
  }

  @Post('invoices/generate-for-class')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT')
  generateInvoicesForClass(
    @Query('classId') classId: string,
    @Query('feeStructureId') feeStructureId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    const now = new Date();
    return this.feesService.generateInvoicesForClass(
      classId, feeStructureId, +month || now.getMonth() + 1, +year || now.getFullYear()
    );
  }

  @Get('invoices')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT')
  getInvoices(@CurrentUser('schoolId') schoolId: string) {
    return this.feesService.getInvoices(schoolId);
  }

  @Get('invoices/student/:studentId')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT', 'PARENT', 'STUDENT')
  getStudentInvoices(@Param('studentId') studentId: string) {
    return this.feesService.getStudentInvoices(studentId);
  }

  @Get('invoices/:id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT', 'PARENT', 'STUDENT')
  getInvoice(@Param('id') id: string) {
    return this.feesService.getInvoice(id);
  }

  @Post('payments')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT')
  recordPayment(@Body() dto: RecordPaymentDto) {
    return this.feesService.recordPayment(dto);
  }

  @Get('pending')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT')
  getPendingFees(@CurrentUser('schoolId') schoolId: string) {
    return this.feesService.getPendingFees(schoolId);
  }

  @Get('stats')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT')
  getStats(@CurrentUser('schoolId') schoolId: string) {
    return this.feesService.getSchoolFeeStats(schoolId);
  }
}
