import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private notificationsService: NotificationsService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        school: { select: { id: true, name: true, logo: true, isActive: true } },
        teacher: { select: { id: true, employeeCode: true } },
        student: { select: { id: true, admissionNo: true, rollNo: true } },
        parent: { select: { id: true } },
        accountant: { select: { id: true, employeeCode: true } },
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new ForbiddenException('Account is deactivated');
    if (user.school && !user.school.isActive)
      throw new ForbiddenException('School account is deactivated');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  async login(user: any) {
    const tokens = await this.generateTokens(user.id, user.email, user.role, user.schoolId);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(tokens.refreshToken, 10) },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, refreshToken: _rt, ...userSafe } = user;
    return { ...tokens, user: userSafe };
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.refreshToken)
      throw new ForbiddenException('Access denied');

    const matches = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!matches) throw new ForbiddenException('Access denied');

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.schoolId);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(tokens.refreshToken, 10) },
    });

    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Logged out successfully' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed, mustChangePassword: false },
    });
    return { message: 'Password changed successfully' };
  }

  /**
   * Force-change password: user does NOT need to supply current password.
   * Only callable when mustChangePassword === true for that user.
   */
  async forceChangePassword(userId: string, newPassword: string, confirmPassword: string) {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (!user.mustChangePassword) {
      throw new ForbiddenException('Password change is not required for this account');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed, mustChangePassword: false },
    });
    return { message: 'Password updated successfully' };
  }

  /**
   * Admin resets any user's password in the same school.
   * Sets mustChangePassword = true and sends a notification.
   */
  async adminResetPassword(
    adminUserId: string,
    targetUserId: string,
    newPassword: string,
    adminRole: string,
  ) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminUserId } });
    if (!admin) throw new NotFoundException('Admin not found');

    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('Target user not found');

    // SCHOOL_ADMIN can only reset users in same school
    if (adminRole === 'SCHOOL_ADMIN' && target.schoolId !== admin.schoolId) {
      throw new ForbiddenException('You can only reset passwords for users in your school');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { password: hashed, mustChangePassword: true },
    });

    // Send in-app notification to the target user
    const adminName = `${admin.firstName} ${admin.lastName}`;
    const schoolId = target.schoolId || admin.schoolId;
    if (schoolId) {
      await this.notificationsService.createPasswordResetNotification(
        targetUserId,
        schoolId,
        adminName,
        adminRole,
      );
    }

    return { message: `Password reset successfully for ${target.firstName} ${target.lastName}` };
  }

  /**
   * Class teacher resets a student password — only if the student
   * belongs to the teacher's assigned class.
   */
  async teacherResetStudentPassword(
    teacherUserId: string,
    targetStudentUserId: string,
    newPassword: string,
  ) {
    const teacherUser = await this.prisma.user.findUnique({
      where: { id: teacherUserId },
      include: {
        teacher: {
          include: {
            classTeacherOf: {
              include: { students: { include: { user: true } } },
            },
          },
        },
      },
    });

    if (!teacherUser?.teacher) throw new ForbiddenException('Teacher profile not found');

    const classTeacherOf = teacherUser.teacher.classTeacherOf;
    if (!classTeacherOf || classTeacherOf.length === 0) {
      throw new ForbiddenException('You are not assigned as a class teacher');
    }

    // Gather all student user IDs from teacher's classes
    const allowedUserIds = classTeacherOf.flatMap((cls) =>
      cls.students.map((s) => s.user.id),
    );

    if (!allowedUserIds.includes(targetStudentUserId)) {
      throw new ForbiddenException('This student is not in your class');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: targetStudentUserId } });
    if (!targetUser) throw new NotFoundException('Student user not found');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: targetStudentUserId },
      data: { password: hashed, mustChangePassword: true },
    });

    // Send notification
    const teacherName = `${teacherUser.firstName} ${teacherUser.lastName}`;
    const schoolId = targetUser.schoolId;
    if (schoolId) {
      await this.notificationsService.createPasswordResetNotification(
        targetStudentUserId,
        schoolId,
        teacherName,
        'TEACHER',
      );
    }

    return { message: `Password reset successfully for ${targetUser.firstName} ${targetUser.lastName}` };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatar: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        schoolId: true,
        school: { select: { id: true, name: true, logo: true, code: true } },
        teacher: true,
        student: {
          include: {
            class: { select: { id: true, name: true } },
            section: { select: { id: true, name: true } },
          },
        },
        parent: {
          include: {
            students: {
              include: {
                user: { select: { firstName: true, lastName: true, avatar: true, email: true, phone: true } },
                class: { select: { id: true, name: true } },
                section: { select: { id: true, name: true } },
              },
            },
          },
        },
        accountant: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async generateTokens(userId: string, email: string, role: Role, schoolId: string | null) {
    const payload = { sub: userId, email, role, schoolId };
    const jwtSecret = this.config.get<string>('JWT_SECRET') as string;
    const jwtRefreshSecret = this.config.get<string>('JWT_REFRESH_SECRET') as string;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload as any, {
        secret: jwtSecret,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload as any, {
        secret: jwtRefreshSecret,
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
