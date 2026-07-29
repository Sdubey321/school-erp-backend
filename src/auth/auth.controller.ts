import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto, ForceChangePasswordDto } from './dto/reset-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Req() req, @Body() _: LoginDto) {
    return this.authService.login(req.user);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Req() req) {
    return this.authService.refresh(req.user.sub, req.user.refreshToken);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current user' })
  async logout(@CurrentUser('sub') userId: string) {
    return this.authService.logout(userId);
  }

  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('sub') userId: string) {
    return this.authService.getProfile(userId);
  }

  @ApiBearerAuth()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password (requires current password)' })
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
  }

  @ApiBearerAuth()
  @Post('force-change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force-change password when admin has reset it (no current password needed)' })
  async forceChangePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ForceChangePasswordDto,
  ) {
    return this.authService.forceChangePassword(userId, dto.newPassword, dto.confirmPassword);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @Post('admin-reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin resets any user password (SCHOOL_ADMIN or SUPER_ADMIN only)' })
  async adminResetPassword(
    @CurrentUser('sub') adminUserId: string,
    @CurrentUser('role') adminRole: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.authService.adminResetPassword(adminUserId, dto.targetUserId, dto.newPassword, adminRole);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('TEACHER')
  @Post('teacher-reset-student-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Class teacher resets a student password (only for their assigned class)' })
  async teacherResetStudentPassword(
    @CurrentUser('sub') teacherUserId: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.authService.teacherResetStudentPassword(teacherUserId, dto.targetUserId, dto.newPassword);
  }
}
