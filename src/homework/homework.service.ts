import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HomeworkService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    classId: string;
    title: string;
    description?: string;
    dueDate: Date;
    sectionId?: string;
    subjectName?: string;
    teacherId?: string;
  }) {
    return this.prisma.homework.create({
      data: {
        classId: data.classId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        sectionId: data.sectionId || undefined,
        subjectName: data.subjectName || undefined,
        teacherId: data.teacherId || undefined,
      },
    });
  }

  async findByClass(classId: string) {
    return this.prisma.homework.findMany({
      where: { classId },
      include: {
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTeacherByUserId(userId: string) {
    return this.prisma.teacher.findUnique({
      where: { userId },
    });
  }

  async findByTeacher(teacherId: string) {
    return this.prisma.homework.findMany({
      where: { teacherId },
      include: {
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: Partial<{ title: string; description: string; dueDate: string; subjectName: string }>) {
    const hw = await this.prisma.homework.findUnique({ where: { id } });
    if (!hw) throw new NotFoundException('Homework not found');
    return this.prisma.homework.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
        ...(data.subjectName !== undefined && { subjectName: data.subjectName }),
      },
    });
  }

  async remove(id: string) {
    const hw = await this.prisma.homework.findUnique({ where: { id } });
    if (!hw) throw new NotFoundException('Homework not found');
    // Delete submissions first
    await this.prisma.homeworkSubmission.deleteMany({ where: { homeworkId: id } });
    return this.prisma.homework.delete({ where: { id } });
  }

  async submitHomework(studentId: string, homeworkId: string, fileUrl?: string, remarks?: string) {
    return this.prisma.homeworkSubmission.upsert({
      where: {
        homeworkId_studentId: { homeworkId, studentId },
      },
      update: {
        status: 'SUBMITTED',
        fileUrl,
        remarks,
        submittedAt: new Date(),
      },
      create: {
        homeworkId,
        studentId,
        status: 'SUBMITTED',
        fileUrl,
        remarks,
        submittedAt: new Date(),
      },
    });
  }
}
