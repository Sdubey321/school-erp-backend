import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  create(@Request() req, @Body() createDto: { title: string; content: string; targetRole?: Role }) {
    // SuperAdmin can post to the school they are currently managing (needs schoolId in body, but for now we take from JWT if present)
    const schoolId = req.user.schoolId;
    if (!schoolId) throw new Error('School ID is required');
    return this.announcementsService.create(schoolId, req.user.sub, createDto);
  }

  @Get()
  findAll(@Request() req) {
    const schoolId = req.user.schoolId;
    if (!schoolId) throw new Error('School ID is required');
    return this.announcementsService.findAll(schoolId, req.user.role);
  }

  @Delete(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  remove(@Request() req, @Param('id') id: string) {
    const schoolId = req.user.schoolId;
    return this.announcementsService.remove(id, schoolId);
  }
}
