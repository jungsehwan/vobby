import * as SecureStore from 'expo-secure-store';

// 소셜 로그인 화면(콘솔 앱 등록 후)이 setAccessToken을 호출하는 자리 (design §0-4)

const ACCESS_TOKEN_KEY = 'vobby.accessToken';

export async function getAccessToken(): Promise<string | null> {
  const stored = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (stored) return stored;
  // 콘솔 앱 미등록 기간의 개발 검증용 — 프로덕션 빌드에선 무시된다
  if (__DEV__ && process.env.EXPO_PUBLIC_DEV_JWT) {
    return process.env.EXPO_PUBLIC_DEV_JWT;
  }
  return null;
}

export async function setAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function clearAccessToken(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}
