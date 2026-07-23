import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, createdBy: string, data: { title: string; content: string; targetRole?: Role }) {
    return this.prisma.announcement.create({
      data: {
        schoolId,
        createdBy,
        title: data.title,
        content: data.content,
        targetRole: data.targetRole,
      },
    });
  }

  async findAll(schoolId: string, role?: Role) {
    const whereClause: any = { schoolId };
    
    // If querying as a specific role (e.g. Student, Parent), only show announcements 
    // targeted to them OR global announcements (targetRole is null)
    if (role && role !== Role.SUPER_ADMIN && role !== Role.SCHOOL_ADMIN) {
      whereClause.OR = [
        { targetRole: role },
        { targetRole: null }
      ];
    }

    return this.prisma.announcement.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async remove(id: string, schoolId: string) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, schoolId },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    return this.prisma.announcement.delete({
      where: { id },
    });
  }
}
