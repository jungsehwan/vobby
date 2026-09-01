import { IsIn, IsString, MinLength } from 'class-validator';
import type { AuthProvider } from '../../user/user.entity.js';

export class LoginDto {
  @IsIn(['google', 'kakao'])
  provider!: AuthProvider;

  /** Google=idToken, Kakao=accessToken */
  @IsString()
  @MinLength(10)
  token!: string;
}
