import { IsString, IsNumber, IsOptional, IsEnum, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeeStructureDto {
  @ApiProperty()
  @IsString()
  schoolId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ default: 'MONTHLY' })
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  dueDay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  isOptional?: boolean;
}
