import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HallTicketsService {
  constructor(private prisma: PrismaService) {}

  /** Generate hall tickets for all students in a class for an exam */
  async generateForClass(examTypeId: string, classId: string, hallNo?: string) {
    const students = await this.prisma.student.findMany({
      where: { classId, user: { isActive: true } },
      orderBy: { rollNo: 'asc' },
    });

    let counter = 1;
    const results = await Promise.all(
      students.map((student) => {
        const seatNo = String(counter++).padStart(3, '0');
        return this.prisma.hallTicket.upsert({
          where: { studentId_examTypeId: { studentId: student.id, examTypeId } },
          create: { studentId: student.id, examTypeId, seatNo, hallNo: hallNo ?? 'HALL-1', isValid: true },
          update: { seatNo, hallNo: hallNo ?? 'HALL-1', isValid: true },
        });
      }),
    );

    return { message: `Generated ${results.length} hall tickets`, count: results.length };
  }

  /** Get all hall tickets for an exam (admin view) */
  async getByExam(examTypeId: string) {
    return this.prisma.hallTicket.findMany({
      where: { examTypeId },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, avatar: true } },
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        examType: { select: { name: true, startDate: true, endDate: true } },
      },
      orderBy: { seatNo: 'asc' },
    });
  }

  /** Get hall tickets for a class + exam (class teacher view) */
  async getByExamAndClass(examTypeId: string, classId: string) {
    return this.prisma.hallTicket.findMany({
      where: { examTypeId, student: { classId } },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, avatar: true } },
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        examType: {
          include: {
            school: { select: { name: true, logo: true, address: true } },
          },
        },
      },
      orderBy: { seatNo: 'asc' },
    });
  }

  /** Get hall tickets for a student */
  async getByStudent(studentId: string) {
    return this.prisma.hallTicket.findMany({
      where: { studentId, isValid: true },
      include: {
        examType: {
          include: {
            school: { select: { name: true, logo: true, address: true, phone: true } },
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  /** Get by student userId (for student's own portal) */
  async getByStudentUserId(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException('Student not found');
    return this.getByStudent(student.id);
  }
}
