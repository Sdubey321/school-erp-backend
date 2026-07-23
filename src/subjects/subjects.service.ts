import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  async findByClass(classId: string) {
    return this.prisma.subject.findMany({
      where: { classId },
      orderBy: { name: 'asc' },
    });
  }

  async create(classId: string, data: { name: string; code?: string; maxMarks?: number; passMark?: number }) {
    return this.prisma.subject.create({
      data: { classId, ...data },
    });
  }

  async update(id: string, data: Partial<{ name: string; code: string; maxMarks: number; passMark: number }>) {
    return this.prisma.subject.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.subject.delete({ where: { id } });
  }
}
