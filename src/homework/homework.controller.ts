import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { HomeworkService } from './homework.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Homework')
@ApiBearerAuth()
@Controller('homework')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Post()
  @Roles('TEACHER', 'SCHOOL_ADMIN')
  async create(@Body() data: any, @Request() req) {
    let teacherId = data.teacherId;
    if (req.user.role === 'TEACHER') {
      const teacher = await this.homeworkService.getTeacherByUserId(req.user.id);
      if (teacher) {
        teacherId = teacher.id;
      }
    }
    
    return this.homeworkService.create({
      ...data,
      teacherId,
      dueDate: new Date(data.dueDate),
    });
  }

  @Get('class/:classId')
  @Roles('STUDENT', 'PARENT', 'TEACHER', 'SCHOOL_ADMIN')
  findByClass(@Param('classId') classId: string) {
    return this.homeworkService.findByClass(classId);
  }

  @Get('teacher/me')
  @Roles('TEACHER')
  async findByTeacher(@Request() req) {
    // Lookup teacher by userId
    const teacher = await this.homeworkService.getTeacherByUserId(req.user.id);
    if (!teacher) return [];
    return this.homeworkService.findByTeacher(teacher.id);
  }
  
  @Get('teacher/:teacherId')
  findByTeacherId(@Param('teacherId') teacherId: string) {
    return this.homeworkService.findByTeacher(teacherId);
  }

  @Post('submit')
  @Roles('STUDENT')
  submitHomework(@Body() data: { studentId: string, homeworkId: string, fileUrl?: string, remarks?: string }) {
    return this.homeworkService.submitHomework(data.studentId, data.homeworkId, data.fileUrl, data.remarks);
  }

  @Patch(':id')
  @Roles('TEACHER', 'SCHOOL_ADMIN')
  update(@Param('id') id: string, @Body() data: any) {
    return this.homeworkService.update(id, data);
  }

  @Delete(':id')
  @Roles('TEACHER', 'SCHOOL_ADMIN')
  remove(@Param('id') id: string) {
    return this.homeworkService.remove(id);
  }
}
