import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';

@ApiTags('Schools')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  @Roles('SUPER_ADMIN')
  create(@Body() dto: CreateSchoolDto) {
    return this.schoolsService.create(dto);
  }

  @Get()
  @Roles('SUPER_ADMIN')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.schoolsService.findAll(+(page ?? 1), +(limit ?? 10), search);
  }

  @Get('dashboard-stats')
  @Roles('SUPER_ADMIN')
  getDashboardStats() {
    return this.schoolsService.getDashboardStats();
  }

  @Get('my-stats')
  @Roles('SCHOOL_ADMIN')
  getMyStats(@CurrentUser('schoolId') schoolId: string) {
    return this.schoolsService.getSchoolAdminStats(schoolId);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  findOne(@Param('id') id: string) {
    return this.schoolsService.findOne(id);
  }

  @Get(':id/stats')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  getStats(@Param('id') id: string) {
    return this.schoolsService.getStats(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateSchoolDto) {
    return this.schoolsService.update(id, dto);
  }

  @Patch(':id/toggle-status')
  @Roles('SUPER_ADMIN')
  toggleStatus(@Param('id') id: string) {
    return this.schoolsService.toggleStatus(id);
  }
}
