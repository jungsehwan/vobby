import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, spacing, typography } from '@vobby/ui-tokens';
import { useRecording } from '@/features/recording/use-recording';

function formatElapsed(totalS: number): string {
  const h = Math.floor(totalS / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const s = totalS % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분 ${s}초`;
}

export default function RecordingScreen() {
  const { permission, session, stats, error, askPermission, start, stop } =
    useRecording();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>경로 기록</Text>

      {permission === 'unknown' && <Text style={styles.caption}>권한 확인 중…</Text>}

      {(permission === 'denied' || permission === 'foreground-only') && (
        <View style={styles.card}>
          <Text style={styles.body}>
            {permission === 'denied'
              ? '이동 경로를 기록하려면 위치 권한이 필요합니다.'
              : '백그라운드 기록을 위해 위치 권한을 "항상 허용"으로 설정해 주세요.'}
          </Text>
          <Pressable style={styles.button} onPress={askPermission}>
            <Text style={styles.buttonLabel}>위치 권한 허용하기</Text>
          </Pressable>
        </View>
      )}

      {permission === 'granted' && !session && (
        <Pressable style={styles.button} onPress={start} testID="start-button">
          <Text style={styles.buttonLabel}>기록 시작</Text>
        </Pressable>
      )}

      {session && (
        <View style={styles.card}>
          <Text style={styles.heading}>기록 중</Text>
          <View style={styles.statRow}>
            <Stat label="포인트" value={String(stats?.pointCount ?? 0)} />
            <Stat
              label="거리"
              value={`${((stats?.distanceM ?? 0) / 1000).toFixed(2)} km`}
            />
            <Stat label="경과" value={formatElapsed(stats?.elapsedS ?? 0)} />
          </View>
          <Pressable
            style={[styles.button, styles.stopButton]}
            onPress={stop}
            testID="stop-button"
          >
            <Text style={styles.buttonLabel}>기록 중지</Text>
          </Pressable>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} testID={`stat-${label}`}>
        {value}
      </Text>
      <Text style={styles.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bgBase,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: { ...typography.title, color: color.textPrimary } as const,
  heading: { ...typography.heading, color: color.textPrimary } as const,
  body: { ...typography.body, color: color.textPrimary } as const,
  caption: { ...typography.caption, color: color.textSecondary } as const,
  error: { ...typography.body, color: color.danger } as const,
  card: {
    backgroundColor: color.bgSubtle,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: color.border,
  },
  button: {
    backgroundColor: color.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  stopButton: { backgroundColor: color.danger },
  buttonLabel: { ...typography.heading, color: color.textInverse } as const,
  statRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: spacing.xs },
  statValue: { ...typography.heading, color: color.primary } as const,
});
