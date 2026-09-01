import { Stack } from 'expo-router';
// 백그라운드 위치 태스크 등록 — 앱 진입점에서 반드시 로드돼야 한다 (design §0-1)
import '@/features/recording/location-task';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Vobby' }} />
    </Stack>
  );
}
