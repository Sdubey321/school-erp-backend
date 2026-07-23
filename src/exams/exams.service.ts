import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  async findAll(schoolId: string) {
    return this.prisma.examType.findMany({
      where: { schoolId },
      include: {
        _count: { select: { examResults: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async create(schoolId: string, data: { name: string; weightage?: number; startDate?: string; endDate?: string; academicYearId: string }) {
    return this.prisma.examType.create({
      data: {
        schoolId,
        academicYearId: data.academicYearId,
        name: data.name,
        weightage: data.weightage ?? 100,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.examType.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.weightage !== undefined && { weightage: data.weightage }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
      },
    });
  }

  async remove(id: string) {
    return this.prisma.examType.delete({ where: { id } });
  }

  async saveMarks(data: {
    studentId: string;
    subjectId: string;
    examTypeId: string;
    marksObtained: number;
    maxMarks?: number;
    isAbsent?: boolean;
    remarks?: string;
  }) {
    return this.prisma.examResult.upsert({
      where: {
        studentId_subjectId_examTypeId: {
          studentId: data.studentId,
          subjectId: data.subjectId,
          examTypeId: data.examTypeId,
        }
      },
      update: {
        marksObtained: data.marksObtained,
        maxMarks: data.maxMarks ?? 100,
        isAbsent: data.isAbsent ?? false,
        remarks: data.remarks,
      },
      create: {
        studentId: data.studentId,
        subjectId: data.subjectId,
        examTypeId: data.examTypeId,
        marksObtained: data.marksObtained,
        maxMarks: data.maxMarks ?? 100,
        isAbsent: data.isAbsent ?? false,
        remarks: data.remarks,
      }
    });
  }

  async getResultsForStudent(studentId: string) {
    return this.prisma.examResult.findMany({
      where: { studentId },
      include: {
        subject: true,
        examType: true,
      },
      orderBy: { examType: { startDate: 'desc' } }
    });
  }

  async getResultsByExam(examTypeId: string, classId?: string) {
    return this.prisma.examResult.findMany({
      where: {
        examTypeId,
        ...(classId && { student: { classId } }),
      },
      include: {
        student: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        subject: true,
      },
    });
  }
}
