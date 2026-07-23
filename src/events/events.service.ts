import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async findAll(schoolId: string) {
    return this.prisma.event.findMany({
      where: { schoolId },
      orderBy: { startDate: 'asc' },
    });
  }

  async create(schoolId: string, data: { title: string; description?: string; startDate: string; endDate?: string; isHoliday?: boolean }, createdBy: string) {
    return this.prisma.event.create({
      data: {
        schoolId,
        title: data.title,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        isHoliday: data.isHoliday ?? false,
        createdBy,
      },
    });
  }

  async update(id: string, data: { title?: string; description?: string; startDate?: string; endDate?: string; isHoliday?: boolean }) {
    return this.prisma.event.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        ...(data.isHoliday !== undefined && { isHoliday: data.isHoliday }),
      },
    });
  }

  async remove(id: string) {
    return this.prisma.event.delete({ where: { id } });
  }
}
