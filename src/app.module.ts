import { Module } from '@nestjs/common';
import { AnnouncementsModule } from './announcements/announcements.module';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { SchoolsModule } from './schools/schools.module';
import { StudentsModule } from './students/students.module';
import { TeachersModule } from './teachers/teachers.module';
import { ClassesModule } from './classes/classes.module';
import { SubjectsModule } from './subjects/subjects.module';
import { AttendanceModule } from './attendance/attendance.module';
import { HomeworkModule } from './homework/homework.module';
import { ExamsModule } from './exams/exams.module';
import { FeesModule } from './fees/fees.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TransportModule } from './transport/transport.module';
import { LibraryModule } from './library/library.module';
import { EventsModule } from './events/events.module';
import { ReportsModule } from './reports/reports.module';
import { AcademicYearsModule } from './academic-years/academic-years.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { SalaryModule } from './salary/salary.module';
import { HallTicketsModule } from './hall-tickets/hall-tickets.module';
import { ExamAttendanceModule } from './exam-attendance/exam-attendance.module';
import { MarksheetTemplatesModule } from './marksheet-templates/marksheet-templates.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SchoolsModule,
    StudentsModule,
    TeachersModule,
    ClassesModule,
    SubjectsModule,
    AttendanceModule,
    HomeworkModule,
    ExamsModule,
    FeesModule,
    MessagesModule,
    NotificationsModule,
    TransportModule,
    LibraryModule,
    EventsModule,
    ReportsModule,
    AcademicYearsModule,
    AnnouncementsModule,
    SalaryModule,
    HallTicketsModule,
    ExamAttendanceModule,
    MarksheetTemplatesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
