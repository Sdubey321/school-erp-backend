import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Exams')
@ApiBearerAuth()
@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get()
  findAll(@CurrentUser('schoolId') schoolId: string) {
    return this.examsService.findAll(schoolId);
  }

  @Post()
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  create(@Body() data: any, @CurrentUser('schoolId') schoolId: string) {
    return this.examsService.create(schoolId, data);
  }

  @Patch(':id')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  update(@Param('id') id: string, @Body() data: any) {
    return this.examsService.update(id, data);
  }

  @Delete(':id')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  remove(@Param('id') id: string) {
    return this.examsService.remove(id);
  }

  @Post('marks')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  saveMarks(@Body() data: any) {
    return this.examsService.saveMarks(data);
  }

  @Get('student/:studentId/results')
  getResultsForStudent(@Param('studentId') studentId: string) {
    return this.examsService.getResultsForStudent(studentId);
  }

  @Get(':examTypeId/results')
  @Roles('SCHOOL_ADMIN', 'TEACHER', 'SUPER_ADMIN')
  getResultsByExam(@Param('examTypeId') examTypeId: string, @Query('classId') classId?: string) {
    return this.examsService.getResultsByExam(examTypeId, classId);
  }
}
