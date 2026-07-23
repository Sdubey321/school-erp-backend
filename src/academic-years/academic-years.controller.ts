import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { AcademicYearsService } from './academic-years.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('AcademicYears')
@ApiBearerAuth()
@Controller('academic-years')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcademicYearsController {
  constructor(private readonly academicyearsService: AcademicYearsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER')
  findAll(@CurrentUser('schoolId') schoolId: string) {
    return this.academicyearsService.findAll(schoolId);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  create(@Body() data: any, @CurrentUser('schoolId') schoolId: string) {
    return this.academicyearsService.create(schoolId, data);
  }

  @Patch(':id/set-current')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  setAsCurrent(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.academicyearsService.setAsCurrent(id, schoolId);
  }
}
