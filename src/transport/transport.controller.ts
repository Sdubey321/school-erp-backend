import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TransportService } from './transport.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Transport')
@ApiBearerAuth()
@Controller('transport')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransportController {
  constructor(private readonly transportService: TransportService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  findAll(@CurrentUser('schoolId') schoolId: string) {
    return this.transportService.findAll(schoolId);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  create(@Body() data: any, @CurrentUser('schoolId') schoolId: string) {
    return this.transportService.create(schoolId, data);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  update(@Param('id') id: string, @Body() data: any) {
    return this.transportService.update(id, data);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  remove(@Param('id') id: string) {
    return this.transportService.remove(id);
  }

  @Post(':id/stops')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  addStop(@Param('id') transportId: string, @Body() data: any) {
    return this.transportService.addStop(transportId, data);
  }

  @Delete('stops/:stopId')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  removeStop(@Param('stopId') stopId: string) {
    return this.transportService.removeStop(stopId);
  }
}
