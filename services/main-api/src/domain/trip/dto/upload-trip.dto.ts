import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type {
  GeoLineStringZM,
  MediaCoordSource,
} from '@vobby/shared-types';

export class UploadMediaDto {
  @IsIn(['photo', 'video'])
  type!: 'photo' | 'video';

  @IsISO8601()
  capturedAt!: string;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon!: number | null;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number | null;

  @IsIn(['exif', 'timesync', 'none'])
  source!: MediaCoordSource;

  @IsOptional()
  @IsInt()
  width!: number | null;

  @IsOptional()
  @IsInt()
  height!: number | null;
}

export class UploadTripDto {
  @IsString()
  @MinLength(4)
  clientKey!: string;

  @IsOptional()
  @IsString()
  title!: string | null;

  @IsISO8601()
  startedAt!: string;

  @IsISO8601()
  endedAt!: string;

  /** GeoJSON LineStringZM — 좌표 검증은 서비스에서 (구조 검증만 여기서) */
  @IsOptional()
  @IsObject()
  path!: GeoLineStringZM | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceM!: number | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UploadMediaDto)
  media!: UploadMediaDto[];
}
