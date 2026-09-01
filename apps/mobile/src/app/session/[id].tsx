import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { color, radius, spacing, typography } from '@vobby/ui-tokens';
import { useSessionMedia } from '@/features/media/use-session-media';
import type { MediaCoordSource } from '@/features/media/media-db';

const SOURCE_LABEL: Record<MediaCoordSource, string> = {
  exif: 'EXIF',
  timesync: '근사',
  none: '미매칭',
};

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, media, scanning, lastScan, error, scan } = useSessionMedia(id);

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.caption}>세션을 찾을 수 없습니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.caption}>
        {new Date(session.started_at * 1000).toLocaleString('ko-KR')} 기록
      </Text>

      <Pressable
        style={[styles.button, scanning && styles.buttonDisabled]}
        onPress={scan}
        disabled={scanning}
        testID="scan-button"
      >
        {scanning ? (
          <ActivityIndicator color={color.textInverse} />
        ) : (
          <Text style={styles.buttonLabel}>사진 불러오기</Text>
        )}
      </Pressable>

      {lastScan && (
        <Text style={styles.caption} testID="scan-summary">
          {lastScan.scanned}장 스캔 — EXIF {lastScan.exif} · 근사{' '}
          {lastScan.timesync} · 미매칭 {lastScan.none}
        </Text>
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      {media.length === 0 && !scanning ? (
        <Text style={styles.caption}>이 시간대에 촬영된 사진이 없습니다.</Text>
      ) : (
        <FlatList
          data={media}
          keyExtractor={(m) => m.asset_id}
          numColumns={3}
          columnWrapperStyle={{ gap: spacing.xs }}
          contentContainerStyle={{ gap: spacing.xs }}
          renderItem={({ item }) => (
            <View style={styles.cell}>
              <Image source={{ uri: item.uri }} style={styles.thumb} />
              <View style={[styles.badge, item.source === 'none' && styles.badgeNone]}>
                <Text style={styles.badgeLabel}>{SOURCE_LABEL[item.source]}</Text>
              </View>
            </View>
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
  caption: { ...typography.caption, color: color.textSecondary } as const,
  error: { ...typography.body, color: color.danger } as const,
  button: {
    backgroundColor: color.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonLabel: { ...typography.heading, color: color.textInverse } as const,
  cell: { flex: 1 / 3, aspectRatio: 1 },
  thumb: { width: '100%', height: '100%', borderRadius: radius.sm },
  badge: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    backgroundColor: color.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
  },
  badgeNone: { backgroundColor: color.textSecondary },
  badgeLabel: { ...typography.caption, color: color.textInverse } as const,
});
