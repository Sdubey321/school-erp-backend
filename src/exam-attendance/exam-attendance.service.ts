import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExamAttendanceService {
  constructor(private prisma: PrismaService) {}

  /** Mark exam attendance for a student+subject+exam (upsert) */
  async markAttendance(dto: {
    studentId: string;
    examTypeId: string;
    subjectId: string;
    date: string;
    isPresent: boolean;
    markedById?: string;
  }) {
    return this.prisma.examAttendance.upsert({
      where: {
        studentId_examTypeId_subjectId: {
          studentId: dto.studentId,
          examTypeId: dto.examTypeId,
          subjectId: dto.subjectId,
        },
      },
      create: {
        studentId: dto.studentId,
        examTypeId: dto.examTypeId,
        subjectId: dto.subjectId,
        date: new Date(dto.date),
        isPresent: dto.isPresent,
        markedById: dto.markedById,
      },
      update: {
        isPresent: dto.isPresent,
        date: new Date(dto.date),
        markedById: dto.markedById,
      },
    });
  }

  /** Bulk mark attendance for an entire class for a subject */
  async markBulk(
    examTypeId: string,
    subjectId: string,
    date: string,
    records: { studentId: string; isPresent: boolean }[],
    markedById?: string,
  ) {
    const ops = records.map((r) =>
      this.prisma.examAttendance.upsert({
        where: {
          studentId_examTypeId_subjectId: {
            studentId: r.studentId,
            examTypeId,
            subjectId,
          },
        },
        create: {
          studentId: r.studentId,
          examTypeId,
          subjectId,
          date: new Date(date),
          isPresent: r.isPresent,
          markedById,
        },
        update: { isPresent: r.isPresent, markedById },
      }),
    );
    return this.prisma.$transaction(ops);
  }

  /** Get exam attendance for an exam+class grouped by subject */
  async getByExamAndClass(examTypeId: string, classId: string) {
    return this.prisma.examAttendance.findMany({
      where: { examTypeId, student: { classId } },
      include: {
        student: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        subject: { select: { id: true, name: true } },
      },
      orderBy: [{ subject: { name: 'asc' } }, { student: { rollNo: 'asc' } }],
    });
  }

  /** Get exam attendance for a student */
  async getByStudent(studentId: string, examTypeId?: string) {
    return this.prisma.examAttendance.findMany({
      where: { studentId, ...(examTypeId && { examTypeId }) },
      include: {
        subject: { select: { name: true } },
        examType: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  /** Get class roster with exam attendance for a subject */
  async getClassRoster(examTypeId: string, classId: string, subjectId: string) {
    const [students, attendance] = await Promise.all([
      this.prisma.student.findMany({
        where: { classId, user: { isActive: true } },
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { rollNo: 'asc' },
      }),
      this.prisma.examAttendance.findMany({
        where: { examTypeId, subjectId, student: { classId } },
      }),
    ]);

    const attendanceMap = new Map(attendance.map((a) => [a.studentId, a.isPresent]));

    return students.map((s) => ({
      studentId: s.id,
      rollNo: s.rollNo,
      name: `${s.user.firstName} ${s.user.lastName}`,
      isPresent: attendanceMap.has(s.id) ? attendanceMap.get(s.id) : null, // null = not marked
    }));
  }
}
