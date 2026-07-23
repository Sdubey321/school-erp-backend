import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { MarksheetTemplatesService } from './marksheet-templates.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Marksheet Templates')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('marksheet-templates')
export class MarksheetTemplatesController {
  constructor(private readonly service: MarksheetTemplatesService) {}

  @Get()
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER')
  findAll(@CurrentUser('schoolId') schoolId: string) {
    return this.service.findAll(schoolId);
  }

  @Post()
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  create(@CurrentUser('schoolId') schoolId: string, @Body() dto: any) {
    return this.service.create(schoolId, dto);
  }

  @Patch(':id')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  update(
    @Param('id') id: string,
    @CurrentUser('schoolId') schoolId: string,
    @Body() dto: any,
  ) {
    return this.service.update(id, schoolId, dto);
  }

  @Patch(':id/set-default')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  setDefault(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.service.setDefault(id, schoolId);
  }

  @Delete(':id')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  /** Get full data for marksheet generation - accessible to class teacher + admin */
  @Get('marksheet-data')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER')
  getMarksheetData(
    @CurrentUser('schoolId') _schoolId: string,
    @Body() dto: { studentId: string; examTypeId: string; templateId?: string },
  ) {
    return this.service.getMarksheetData(dto.studentId, dto.examTypeId, dto.templateId);
  }

  /** GET version for easier browser access */
  @Get('marksheet-data/:studentId/:examTypeId')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  getMarksheetDataGet(
    @Param('studentId') studentId: string,
    @Param('examTypeId') examTypeId: string,
  ) {
    return this.service.getMarksheetData(studentId, examTypeId);
  }
}
