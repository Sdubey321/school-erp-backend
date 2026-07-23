import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async findAll(schoolId: string) {
    return this.prisma.class.findMany({
      where: { schoolId },
      include: {
        sections: true,
        subjects: true,
        classTeacher: {
          include: { user: { select: { firstName: true, lastName: true } } }
        },
        _count: {
          select: { students: true }
        }
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(schoolId: string, data: { name: string; roomNo?: string; classTeacherId?: string }) {
    return this.prisma.class.create({
      data: {
        schoolId,
        name: data.name,
        roomNo: data.roomNo,
        classTeacherId: data.classTeacherId || null,
      },
    });
  }

  async update(id: string, data: { name?: string; roomNo?: string; classTeacherId?: string | null }) {
    return this.prisma.class.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.roomNo !== undefined && { roomNo: data.roomNo }),
        ...(data.classTeacherId !== undefined && { classTeacherId: data.classTeacherId }),
      },
    });
  }

  async remove(id: string) {
    return this.prisma.class.delete({ where: { id } });
  }

  async createSection(classId: string, data: { name: string; roomNo?: string }) {
    return this.prisma.section.create({
      data: {
        classId,
        name: data.name,
        roomNo: data.roomNo,
      },
    });
  }

  async updateSection(id: string, data: { name?: string; roomNo?: string }) {
    return this.prisma.section.update({
      where: { id },
      data,
    });
  }

  async removeSection(id: string) {
    return this.prisma.section.delete({ where: { id } });
  }
}
