import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Target user ID whose password will be reset' })
  @IsString()
  targetUserId: string;

  @ApiProperty({ description: 'New password to set' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class ForceChangePasswordDto {
  @ApiProperty({ description: 'New password chosen by the user' })
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiProperty({ description: 'Confirm new password' })
  @IsString()
  @MinLength(8)
  confirmPassword: string;
}
