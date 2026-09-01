import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { MediaCoordSource } from '@vobby/shared-types';
import { color, radius, spacing, typography } from '@vobby/ui-tokens';
import { getTrip, getTripMedia } from '@/features/trips/trips-db';

const SOURCE_LABEL: Record<MediaCoordSource, string> = {
  exif: 'EXIF',
  timesync: '근사',
  none: '위치 없음',
};

function formatTime(epochS: number): string {
  const d = new Date(epochS * 1000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = getTrip(id);
  const media = getTripMedia(id);

  if (!trip) {
    return (
      <View style={styles.container}>
        <Text style={styles.caption}>여행을 찾을 수 없습니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.caption}>
        {new Date(trip.started_at * 1000).toLocaleDateString('ko-KR')} · 사진{' '}
        {trip.media_count}장
        {trip.distance_m !== null
          ? ` · 약 ${(trip.distance_m / 1000).toFixed(1)}km`
          : ''}
      </Text>

      <FlatList
        data={media}
        keyExtractor={(m) => m.asset_id}
        contentContainerStyle={{ gap: spacing.md }}
        renderItem={({ item }) => (
          <View style={styles.row} testID={`media-${item.asset_id}`}>
            <Image source={{ uri: item.uri }} style={styles.thumb} />
            <View style={styles.rowBody}>
              <Text style={styles.body}>{formatTime(item.captured_at)}</Text>
              <Text style={styles.caption}>
                {SOURCE_LABEL[item.source as MediaCoordSource]}
                {item.lat !== null && item.lon !== null
                  ? ` · ${item.lat.toFixed(4)}, ${item.lon.toFixed(4)}`
                  : ''}
              </Text>
            </View>
          </View>
        )}
      />
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
  body: { ...typography.body, color: color.textPrimary } as const,
  caption: { ...typography.caption, color: color.textSecondary } as const,
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: color.bgSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: color.border,
  },
  thumb: { width: 72, height: 72, borderRadius: radius.sm },
  rowBody: { justifyContent: 'center', gap: spacing.xs },
});
