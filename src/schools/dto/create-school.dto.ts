import { IsString, IsOptional, IsEmail, IsEnum, IsInt, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SchoolPlan } from '@prisma/client';

export class CreateSchoolDto {
  @ApiProperty({ example: 'Delhi Public School' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'DPS001' })
  @IsString()
  code: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pincode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ enum: SchoolPlan })
  @IsOptional()
  @IsEnum(SchoolPlan)
  plan?: SchoolPlan;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  establishedYear?: number;

  @ApiPropertyOptional({ example: 'CBSE' })
  @IsOptional()
  @IsString()
  board?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  principalName?: string;

  // Admin user creation
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  adminEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminPassword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminFirstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminLastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminPhone?: string;
}
