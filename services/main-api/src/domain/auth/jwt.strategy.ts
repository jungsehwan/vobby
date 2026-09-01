import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
}

/** request.user에 주입되는 형태 */
export interface AuthenticatedUser {
  userId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      // 시크릿 없이 기동하면 모든 토큰이 검증 불가 — 부팅 시점에 실패시킨다
      throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return { userId: payload.sub };
  }
}
