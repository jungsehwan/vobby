import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/jwt.strategy.js';
import { TripService } from './trip.service.js';
import { UploadTripDto } from './dto/upload-trip.dto.js';

@Controller('v1/trips')
@UseGuards(JwtAuthGuard)
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @Post()
  upload(@Req() req: Request, @Body() dto: UploadTripDto) {
    const { userId } = req.user as AuthenticatedUser;
    return this.tripService.uploadTrip(userId, dto);
  }

  @Get()
  list(@Req() req: Request) {
    const { userId } = req.user as AuthenticatedUser;
    return this.tripService.listTrips(userId);
  }
}
