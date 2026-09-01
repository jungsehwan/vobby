import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { color, radius, spacing, typography } from '@vobby/ui-tokens';
import { useTrips } from '@/features/trips/use-trips';

function formatRange(startS: number, endS: number): string {
  const s = new Date(startS * 1000);
  const e = new Date(endS * 1000);
  const d = (x: Date) => `${x.getMonth() + 1}.${x.getDate()}`;
  return d(s) === d(e) ? d(s) : `${d(s)} ~ ${d(e)}`;
}

export default function TripsScreen() {
  const { trips, scanning, progress, lastResult, error, scan } = useTrips();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>내 여행</Text>

      <Pressable
        style={[styles.button, scanning && styles.buttonDisabled]}
        onPress={scan}
        disabled={scanning}
        testID="scan-button"
      >
        {scanning ? (
          <View style={styles.scanRow}>
            <ActivityIndicator color={color.textInverse} />
            <Text style={styles.buttonLabel}>스캔 중… ({progress}페이지)</Text>
          </View>
        ) : (
          <Text style={styles.buttonLabel}>사진 스캔해서 여행 만들기</Text>
        )}
      </Pressable>

      {lastResult && (
        <Text style={styles.caption} testID="scan-summary">
          사진 {lastResult.total}장 (신규 {lastResult.added}) → 여행{' '}
          {lastResult.tripCount}개
        </Text>
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      {trips.length === 0 && !scanning ? (
        <Text style={styles.caption}>
          사진을 스캔하면 여행이 자동으로 만들어져요.
        </Text>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ gap: spacing.md }}
          renderItem={({ item }) => (
            <Link href={{ pathname: '/trip/[id]', params: { id: item.id } }} asChild>
              <Pressable style={styles.card} testID={`trip-${item.id}`}>
                <Text style={styles.body}>
                  {formatRange(item.started_at, item.ended_at)} 여행
                </Text>
                <Text style={styles.caption}>
                  사진 {item.media_count}장
                  {item.distance_m !== null
                    ? ` · 약 ${(item.distance_m / 1000).toFixed(1)}km`
                    : ''}
                </Text>
              </Pressable>
            </Link>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bgBase,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { ...typography.title, color: color.textPrimary } as const,
  body: { ...typography.body, color: color.textPrimary } as const,
  caption: { ...typography.caption, color: color.textSecondary } as const,
  error: { ...typography.body, color: color.danger } as const,
  button: {
    backgroundColor: color.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonLabel: { ...typography.heading, color: color.textInverse } as const,
  scanRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  card: {
    backgroundColor: color.bgSubtle,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: color.border,
  },
});
