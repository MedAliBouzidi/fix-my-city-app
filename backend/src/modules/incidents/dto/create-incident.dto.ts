import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IncidentCategory } from '../../../common/enums/incident-category.enum';

export class CreateIncidentDto {
  @ApiProperty({ example: 'Severe Pothole on Avenue Habib Bourguiba' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: 'Deep hole in the middle lane causing vehicular damage.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  description: string;

  @ApiProperty({ enum: IncidentCategory, example: IncidentCategory.ROADS })
  @IsEnum(IncidentCategory, {
    message: `category must be one of: ${Object.values(IncidentCategory).join(', ')}`,
  })
  @IsNotEmpty()
  category: IncidentCategory;

  @ApiProperty({ example: 'Avenue Habib Bourguiba, Tunis' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  streetAddress: string;

  @ApiProperty({ example: 36.8008 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 10.18 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}
