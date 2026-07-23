import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Subjects')
@ApiBearerAuth()
@Controller('subjects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  @Roles('TEACHER', 'SCHOOL_ADMIN', 'STUDENT', 'PARENT')
  findByClass(@Query('classId') classId: string) {
    return this.subjectsService.findByClass(classId);
  }

  @Post()
  @Roles('SCHOOL_ADMIN')
  create(@Body() data: { classId: string; name: string; code?: string; maxMarks?: number; passMark?: number }) {
    return this.subjectsService.create(data.classId, data);
  }

  @Patch(':id')
  @Roles('SCHOOL_ADMIN')
  update(@Param('id') id: string, @Body() data: any) {
    return this.subjectsService.update(id, data);
  }

  @Delete(':id')
  @Roles('SCHOOL_ADMIN')
  remove(@Param('id') id: string) {
    return this.subjectsService.remove(id);
  }
}
