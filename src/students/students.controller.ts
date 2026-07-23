import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';

@ApiTags('Students')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  create(@Body() dto: CreateStudentDto, @CurrentUser('schoolId') schoolId: string) {
    return this.studentsService.create(dto, schoolId);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'ACCOUNTANT')
  findAll(@CurrentUser('schoolId') schoolId: string, @Query() query: any) {
    return this.studentsService.findAll(schoolId, query);
  }

  @Get('my-profile')
  @Roles('STUDENT')
  getMyProfile(@CurrentUser('sub') userId: string) {
    return this.studentsService.findByUserId(userId);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'ACCOUNTANT')
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Get(':id/attendance-summary')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STUDENT')
  getAttendanceSummary(
    @Param('id') id: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.studentsService.getAttendanceSummary(id, month ? +month : undefined, year ? +year : undefined);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.studentsService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  deactivate(@Param('id') id: string) {
    return this.studentsService.deactivate(id);
  }

  @Post('promote')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  promote(@Body() dto: { studentIds: string[]; nextClassId: string; nextSectionId?: string }) {
    return this.studentsService.promoteBulk(dto.studentIds, dto.nextClassId, dto.nextSectionId);
  }
}
