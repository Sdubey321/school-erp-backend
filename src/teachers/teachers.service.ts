import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, data: any) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) throw new ConflictException('Email already in use');

    const hashedPassword = await bcrypt.hash(data.password || 'Teacher@123', 10);

    return this.prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          schoolId,
          role: 'TEACHER',
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
        },
      });

      // Create teacher profile
      const teacher = await tx.teacher.create({
        data: {
          userId: user.id,
          employeeCode: data.employeeCode,
          qualification: data.qualification,
          joiningDate: new Date(data.joiningDate),
          department: data.department,
        },
        include: {
          user: { select: { firstName: true, lastName: true, email: true, phone: true, isActive: true } }
        }
      });

      return teacher;
    });
  }

  async findMe(userId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        classTeacherOf: { select: { id: true, name: true, sections: { select: { id: true, name: true } } } },
        subjectAssignments: { 
          select: { 
            classId: true, 
            subjectId: true,
            class: { select: { id: true, name: true, sections: { select: { id: true, name: true } } } },
            subject: { select: { id: true, name: true } }
          }
        },
      }
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found');
    return teacher;
  }

  async findAll(schoolId: string) {
    return this.prisma.teacher.findMany({
      where: { user: { schoolId } },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true, isActive: true } },
        classTeacherOf: { select: { name: true } },
      },
      orderBy: { user: { firstName: 'asc' } },
    });
  }

  async update(id: string, data: any) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id }, include: { user: true } });
    if (!teacher) throw new NotFoundException('Teacher not found');

    const userUpdate: any = {};
    if (data.firstName) userUpdate.firstName = data.firstName;
    if (data.lastName) userUpdate.lastName = data.lastName;
    if (data.email) userUpdate.email = data.email;
    if (data.phone) userUpdate.phone = data.phone;
    if (typeof data.isActive === 'boolean') userUpdate.isActive = data.isActive;

    const teacherUpdate: any = {};
    if (data.qualification) teacherUpdate.qualification = data.qualification;
    if (data.department) teacherUpdate.department = data.department;
    if (data.employeeCode) teacherUpdate.employeeCode = data.employeeCode;

    return this.prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({
          where: { id: teacher.userId },
          data: userUpdate,
        });
      }

      if (Object.keys(teacherUpdate).length > 0) {
        return tx.teacher.update({
          where: { id },
          data: teacherUpdate,
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true, isActive: true } }
          }
        });
      }

      return this.prisma.teacher.findUnique({ where: { id }, include: { user: true } });
    });
  }

  async remove(id: string) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id } });
    if (!teacher) throw new NotFoundException('Teacher not found');

    // Soft delete by setting user isActive to false
    return this.prisma.user.update({
      where: { id: teacher.userId },
      data: { isActive: false },
    });
  }

  // ─── CLASS TEACHER POWER METHODS ──────────────────────────────────

  /** Get teacher's assigned class and all students in it */
  async getMyClassStudents(userId: string, schoolId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
      include: {
        classTeacherOf: {
          include: {
            sections: true,
            students: {
              where: { user: { isActive: true } },
              include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true } },
                section: { select: { id: true, name: true } },
                parent: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
              },
              orderBy: { rollNo: 'asc' },
            },
          },
        },
        user: { select: { firstName: true, lastName: true } },
      },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found');
    return teacher;
  }

  /** Class teacher adds a student to their class (class is pre-filled) */
  async addStudentAsClassTeacher(userId: string, schoolId: string, data: any) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
      include: { classTeacherOf: { select: { id: true, name: true } } },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found');
    if (!teacher.classTeacherOf || teacher.classTeacherOf.length === 0) {
      throw new ForbiddenException('You are not a class teacher. Only class teachers can add students.');
    }

    const classId = data.classId || teacher.classTeacherOf[0].id;
    // Ensure the teacher is class teacher of the target class
    const isClassTeacherOf = teacher.classTeacherOf.some((c) => c.id === classId);
    if (!isClassTeacherOf) {
      throw new ForbiddenException('You can only add students to your own class.');
    }

    // Delegate to students create logic
    const existingAdmission = await this.prisma.student.findUnique({
      where: { admissionNo: data.admissionNo },
    });
    if (existingAdmission) throw new ConflictException('Admission number already exists');

    const existingEmail = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existingEmail) throw new ConflictException('Email already in use');

    const password = await bcrypt.hash(data.password || data.admissionNo, 10);

    const user = await this.prisma.user.create({
      data: { schoolId, role: 'STUDENT', firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone, password },
    });

    return this.prisma.student.create({
      data: {
        userId: user.id,
        admissionNo: data.admissionNo,
        rollNo: data.rollNo,
        classId,
        sectionId: data.sectionId,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender,
        bloodGroup: data.bloodGroup,
        address: data.address,
        academicYearId: data.academicYearId,
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        class: { select: { name: true } },
        section: { select: { name: true } },
      },
    });
  }

  /** Class teacher promotes students in their class to the next class */
  async promoteStudentsAsClassTeacher(
    userId: string,
    studentIds: string[],
    nextClassId: string,
    nextSectionId?: string,
  ) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
      include: { classTeacherOf: { select: { id: true } } },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found');
    if (!teacher.classTeacherOf || teacher.classTeacherOf.length === 0) {
      throw new ForbiddenException('Only class teachers can promote students.');
    }

    const myClassIds = teacher.classTeacherOf.map((c) => c.id);

    // Verify all students belong to teacher's class
    const students = await this.prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, classId: true },
    });

    const unauthorized = students.filter((s) => !myClassIds.includes(s.classId ?? ''));
    if (unauthorized.length > 0) {
      throw new ForbiddenException('Some students do not belong to your class.');
    }

    return this.prisma.$transaction(
      studentIds.map((id) =>
        this.prisma.student.update({
          where: { id },
          data: { classId: nextClassId, ...(nextSectionId && { sectionId: nextSectionId }) },
        }),
      ),
    );
  }
}
