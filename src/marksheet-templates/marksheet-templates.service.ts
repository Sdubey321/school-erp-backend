import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MarksheetTemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(schoolId: string) {
    return this.prisma.marksheetTemplate.findMany({
      where: { schoolId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(schoolId: string, dto: {
    name: string;
    style?: string;
    showLogo?: boolean;
    showRank?: boolean;
    showSignature?: boolean;
    primaryColor?: string;
    headerText?: string;
    footerText?: string;
    isDefault?: boolean;
  }) {
    // If setting as default, unset others
    if (dto.isDefault) {
      await this.prisma.marksheetTemplate.updateMany({
        where: { schoolId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.marksheetTemplate.create({
      data: { schoolId, ...dto },
    });
  }

  async update(id: string, schoolId: string, dto: Partial<{
    name: string;
    style: string;
    showLogo: boolean;
    showRank: boolean;
    showSignature: boolean;
    primaryColor: string;
    headerText: string;
    footerText: string;
    isDefault: boolean;
  }>) {
    const template = await this.prisma.marksheetTemplate.findFirst({ where: { id, schoolId } });
    if (!template) throw new NotFoundException('Template not found');

    if (dto.isDefault) {
      await this.prisma.marksheetTemplate.updateMany({
        where: { schoolId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }
    return this.prisma.marksheetTemplate.update({ where: { id }, data: dto });
  }

  async setDefault(id: string, schoolId: string) {
    const template = await this.prisma.marksheetTemplate.findFirst({ where: { id, schoolId } });
    if (!template) throw new NotFoundException('Template not found');
    await this.prisma.marksheetTemplate.updateMany({ where: { schoolId }, data: { isDefault: false } });
    return this.prisma.marksheetTemplate.update({ where: { id }, data: { isDefault: true } });
  }

  async remove(id: string) {
    return this.prisma.marksheetTemplate.delete({ where: { id } });
  }

  /** Get full data needed to generate a marksheet */
  async getMarksheetData(studentId: string, examTypeId: string, templateId?: string) {
    const [student, examResults, examType, reportCard] = await Promise.all([
      this.prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: { include: { school: { select: { name: true, logo: true, address: true, phone: true } } } },
          class: true,
          section: true,
          academicYear: true,
          parent: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
        },
      }),
      this.prisma.examResult.findMany({
        where: { studentId, examTypeId },
        include: { subject: true },
        orderBy: { subject: { name: 'asc' } },
      }),
      this.prisma.examType.findUnique({ where: { id: examTypeId } }),
      this.prisma.reportCard.findFirst({
        where: { studentId, examType: { id: examTypeId } },
      }),
    ]);

    if (!student) throw new NotFoundException('Student not found');

    // Calculate totals
    const totalMaxMarks = examResults.reduce((a, r) => a + r.maxMarks, 0);
    const totalObtained = examResults.reduce((a, r) => a + (r.isAbsent ? 0 : r.marksObtained), 0);
    const percentage = totalMaxMarks > 0 ? (totalObtained / totalMaxMarks) * 100 : 0;

    // Fetch template
    const template = templateId
      ? await this.prisma.marksheetTemplate.findUnique({ where: { id: templateId } })
      : await this.prisma.marksheetTemplate.findFirst({
          where: { schoolId: student.user.schoolId!, isDefault: true },
        });

    // Get exam attendance
    const examAttendances = await this.prisma.examAttendance.findMany({
      where: { studentId, examTypeId },
      select: { subjectId: true, isPresent: true },
    });
    const absentSubjectIds = new Set(
      examAttendances.filter((a) => !a.isPresent).map((a) => a.subjectId),
    );

    return {
      student,
      examType,
      examResults: examResults.map((r) => ({
        ...r,
        effectiveAbsent: r.isAbsent || absentSubjectIds.has(r.subjectId),
      })),
      template,
      summary: {
        totalMaxMarks,
        totalObtained,
        percentage: Math.round(percentage * 100) / 100,
        grade: this.calculateGrade(percentage),
        rank: reportCard?.rank ?? null,
      },
    };
  }

  private calculateGrade(pct: number): string {
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B+';
    if (pct >= 60) return 'B';
    if (pct >= 50) return 'C';
    if (pct >= 33) return 'D';
    return 'F';
  }
}
