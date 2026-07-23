import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { StudentsService } from '../students/students.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Teachers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teachers')
export class TeachersController {
  constructor(
    private readonly teachersService: TeachersService,
    private readonly studentsService: StudentsService,
  ) {}

  @Post()
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  create(@Body() data: any, @Request() req) {
    return this.teachersService.create(req.user.schoolId, data);
  }

  @Get('me')
  @Roles('TEACHER')
  findMe(@Request() req) {
    return this.teachersService.findMe(req.user.id);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  findAll(@Request() req) {
    return this.teachersService.findAll(req.user.schoolId);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  update(@Param('id') id: string, @Body() data: any) {
    return this.teachersService.update(id, data);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  remove(@Param('id') id: string) {
    return this.teachersService.remove(id);
  }

  // ─── CLASS TEACHER POWER ENDPOINTS ────────────────────────────────

  /** Class Teacher: get all students in their assigned class */
  @Get('class-teacher/my-class')
  @Roles('TEACHER', 'SCHOOL_ADMIN')
  getMyClass(@CurrentUser('sub') userId: string, @Request() req) {
    return this.teachersService.getMyClassStudents(userId, req.user.schoolId);
  }

  /** Class Teacher: add a new student to their class */
  @Post('class-teacher/add-student')
  @Roles('TEACHER', 'SCHOOL_ADMIN')
  addStudent(@Body() data: any, @Request() req) {
    return this.teachersService.addStudentAsClassTeacher(req.user.id, req.user.schoolId, data);
  }

  /** Class Teacher: promote selected students to next class */
  @Post('class-teacher/promote')
  @Roles('TEACHER', 'SCHOOL_ADMIN')
  promote(@Body() dto: { studentIds: string[]; nextClassId: string; nextSectionId?: string }, @Request() req) {
    return this.teachersService.promoteStudentsAsClassTeacher(req.user.id, dto.studentIds, dto.nextClassId, dto.nextSectionId);
  }
}

