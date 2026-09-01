import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../user/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './jwt.strategy.js';
import { RefreshToken } from './refresh-token.entity.js';
import { GoogleVerifier } from './verifiers/google.verifier.js';
import { KakaoVerifier } from './verifiers/kakao.verifier.js';
import {
  GOOGLE_VERIFIER,
  KAKAO_VERIFIER,
} from './verifiers/provider-verifier.interface.js';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([RefreshToken]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다');
        }
        // env 문자열('1h' 등)을 jsonwebtoken의 ms 템플릿 타입으로 좁힘
        const expiresIn = config.get<string>(
          'JWT_ACCESS_TTL',
          '1h',
        ) as JwtSignOptions['expiresIn'];
        return { secret, signOptions: { expiresIn } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: GOOGLE_VERIFIER, useClass: GoogleVerifier },
    { provide: KAKAO_VERIFIER, useClass: KakaoVerifier },
  ],
})
export class AuthModule {}
