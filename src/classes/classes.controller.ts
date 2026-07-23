import { Controller, Get, Post, Body, UseGuards, Request, Patch, Param, Delete } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Classes')
@ApiBearerAuth()
@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  findAll(@Request() req) {
    const schoolId = req.user.schoolId;
    return this.classesService.findAll(schoolId);
  }

  @Post()
  @Roles('SCHOOL_ADMIN')
  create(@Request() req, @Body() data: { name: string; roomNo?: string; classTeacherId?: string }) {
    const schoolId = req.user.schoolId;
    return this.classesService.create(schoolId, data);
  }

  @Patch(':id')
  @Roles('SCHOOL_ADMIN')
  update(@Param('id') id: string, @Body() data: { name?: string; roomNo?: string; classTeacherId?: string | null }) {
    return this.classesService.update(id, data);
  }

  @Delete(':id')
  @Roles('SCHOOL_ADMIN')
  remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }

  @Post(':id/sections')
  @Roles('SCHOOL_ADMIN')
  createSection(@Param('id') classId: string, @Body() data: { name: string; roomNo?: string }) {
    return this.classesService.createSection(classId, data);
  }

  @Patch('sections/:id')
  @Roles('SCHOOL_ADMIN')
  updateSection(@Param('id') id: string, @Body() data: { name?: string; roomNo?: string }) {
    return this.classesService.updateSection(id, data);
  }

  @Delete('sections/:id')
  @Roles('SCHOOL_ADMIN')
  removeSection(@Param('id') id: string) {
    return this.classesService.removeSection(id);
  }
}
