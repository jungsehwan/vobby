import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Vobby' }} />
      <Stack.Screen name="trip/[id]" options={{ title: '여행 타임라인' }} />
    </Stack>
  );
}
