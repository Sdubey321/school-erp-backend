import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateStudentDto, schoolId: string) {
    const existingAdmission = await this.prisma.student.findUnique({
      where: { admissionNo: dto.admissionNo },
    });
    if (existingAdmission)
      throw new ConflictException('Admission number already exists');

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) throw new ConflictException('Email already in use');

    const password = await bcrypt.hash(dto.password || dto.admissionNo, 10);

    const user = await this.prisma.user.create({
      data: {
        schoolId,
        role: 'STUDENT',
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        password,
      },
    });

    const student = await this.prisma.student.create({
      data: {
        userId: user.id,
        admissionNo: dto.admissionNo,
        rollNo: dto.rollNo,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        bloodGroup: dto.bloodGroup,
        address: dto.address,
        parentId: dto.parentId,
        classId: dto.classId,
        sectionId: dto.sectionId,
        academicYearId: dto.academicYearId,
        transportId: dto.transportId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        class: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        parent: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
      },
    });

    return student;
  }

  async findAll(schoolId: string, query: any) {
    const { page = 1, limit = 20, search, classId, sectionId, gender } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      user: { schoolId, isActive: true },
      ...(classId && { classId }),
      ...(sectionId && { sectionId }),
      ...(gender && { gender }),
      ...(search && {
        OR: [
          { admissionNo: { contains: search, mode: 'insensitive' } },
          { rollNo: { contains: search, mode: 'insensitive' } },
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take: +limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true } },
          class: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
          parent: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
        },
        orderBy: { user: { firstName: 'asc' } },
      }),
      this.prisma.student.count({ where }),
    ]);

    return { students, total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) };
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true, isActive: true } },
        class: true,
        section: true,
        academicYear: true,
        parent: { include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } } },
        transport: true,
        _count: {
          select: { attendances: true, examResults: true, feeInvoices: true, homeworkSubmissions: true },
        },
      },
    });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async findByUserId(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true } },
        class: true,
        section: true,
        academicYear: true,
        parent: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
      },
    });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async update(id: string, dto: UpdateStudentDto) {
    const student = await this.findOne(id);

    await this.prisma.user.update({
      where: { id: student.userId },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.avatar && { avatar: dto.avatar }),
      },
    });

    return this.prisma.student.update({
      where: { id },
      data: {
        ...(dto.rollNo && { rollNo: dto.rollNo }),
        ...(dto.dateOfBirth && { dateOfBirth: new Date(dto.dateOfBirth) }),
        ...(dto.gender && { gender: dto.gender }),
        ...(dto.bloodGroup && { bloodGroup: dto.bloodGroup }),
        ...(dto.address && { address: dto.address }),
        ...(dto.classId && { classId: dto.classId }),
        ...(dto.sectionId && { sectionId: dto.sectionId }),
        ...(dto.parentId && { parentId: dto.parentId }),
        ...(dto.transportId !== undefined && { transportId: dto.transportId }),
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        class: { select: { name: true } },
        section: { select: { name: true } },
      },
    });
  }

  async deactivate(id: string) {
    const student = await this.findOne(id);
    return this.prisma.user.update({
      where: { id: student.userId },
      data: { isActive: false },
    });
  }

  async promoteBulk(studentIds: string[], nextClassId: string, nextSectionId?: string) {
    return this.prisma.$transaction(
      studentIds.map((id) => 
        this.prisma.student.update({
          where: { id },
          data: { 
            classId: nextClassId, 
            ...(nextSectionId && { sectionId: nextSectionId }) 
          }
        })
      )
    );
  }

  async getAttendanceSummary(studentId: string, month?: number, year?: number) {
    const now = new Date();
    const m = month || now.getMonth() + 1;
    const y = year || now.getFullYear();

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0);

    const attendances = await this.prisma.attendance.groupBy({
      by: ['status'],
      where: { studentId, date: { gte: startDate, lte: endDate } },
      _count: true,
    });

    const summary = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0, total: 0 };
    attendances.forEach((a) => {
      summary[a.status] = a._count;
      summary.total += a._count;
    });
    return summary;
  }
}
