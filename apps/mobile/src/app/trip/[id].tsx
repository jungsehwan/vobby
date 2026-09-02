import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { MediaCoordSource } from '@vobby/shared-types';
import { color, radius, spacing, typography } from '@vobby/ui-tokens';
import { getTrip, getTripMedia } from '@/features/trips/trips-db';
import { uploadTrip } from '@/features/trips/trip-upload.service';
import { isInProgress } from '@/features/trips/short-form.service';
import { useShortForm } from '@/features/trips/use-short-form';
import { ApiError } from '@/lib/api-client';

const SHORT_FORM_STAGE: Record<string, string> = {
  requested: '생성 대기 중…',
  analyzing: 'AI가 사진과 경로를 분석 중…',
  rendering: '영상을 만드는 중…',
};

const SOURCE_LABEL: Record<MediaCoordSource, string> = {
  exif: 'EXIF',
  timesync: '근사',
  none: '위치 없음',
};

function formatTime(epochS: number): string {
  const d = new Date(epochS * 1000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

type UploadState =
  | { phase: 'idle' }
  | { phase: 'uploading' }
  | { phase: 'done' }
  | { phase: 'error'; message: string };

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = getTrip(id);
  const media = getTripMedia(id);
  const [upload, setUpload] = useState<UploadState>({ phase: 'idle' });
  const [serverTripId, setServerTripId] = useState<string | null>(null);
  const shortForm = useShortForm();

  const onUpload = useCallback(async () => {
    setUpload({ phase: 'uploading' });
    try {
      const response = await uploadTrip(id);
      setServerTripId(response.id);
      setUpload({ phase: 'done' });
    } catch (e) {
      const message =
        e instanceof ApiError && e.code === 'AUTH_REQUIRED'
          ? '로그인 후 이용할 수 있어요.'
          : e instanceof Error
            ? e.message
            : String(e);
      setUpload({ phase: 'error', message });
    }
  }, [id]);

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

      <Pressable
        style={[styles.uploadButton, upload.phase === 'uploading' && styles.uploadDisabled]}
        onPress={onUpload}
        disabled={upload.phase === 'uploading'}
        testID="upload-button"
      >
        {upload.phase === 'uploading' ? (
          <ActivityIndicator color={color.textInverse} />
        ) : (
          <Text style={styles.uploadLabel}>
            {upload.phase === 'done' ? '서버에 저장됨 ✓' : '서버에 올리기'}
          </Text>
        )}
      </Pressable>
      {upload.phase === 'error' && (
        <Text style={styles.error} testID="upload-error">{upload.message}</Text>
      )}

      {upload.phase === 'done' && serverTripId && (
        <Pressable
          style={[
            styles.uploadButton,
            (shortForm.requesting ||
              (shortForm.shortForm && isInProgress(shortForm.shortForm.status))) &&
              styles.uploadDisabled,
          ]}
          onPress={() => shortForm.request(serverTripId)}
          disabled={
            shortForm.requesting ||
            (shortForm.shortForm !== null && isInProgress(shortForm.shortForm.status))
          }
          testID="shortform-button"
        >
          {shortForm.requesting ||
          (shortForm.shortForm && isInProgress(shortForm.shortForm.status)) ? (
            <View style={styles.progressRow}>
              <ActivityIndicator color={color.textInverse} />
              <Text style={styles.uploadLabel}>
                {SHORT_FORM_STAGE[shortForm.shortForm?.status ?? 'requested'] ??
                  '처리 중…'}
              </Text>
            </View>
          ) : (
            <Text style={styles.uploadLabel}>
              {shortForm.shortForm?.status === 'done'
                ? '숏폼 완성 ✓ 다시 만들기'
                : shortForm.shortForm?.status === 'failed'
                  ? '실패 — 다시 시도'
                  : '숏폼 만들기'}
            </Text>
          )}
        </Pressable>
      )}
      {shortForm.shortForm?.status === 'done' && shortForm.shortForm.videoUrl && (
        <Pressable
          onPress={() => Linking.openURL(shortForm.shortForm!.videoUrl!)}
          testID="shortform-open"
        >
          <Text style={styles.link}>완성된 영상 보기 →</Text>
        </Pressable>
      )}
      {shortForm.shortForm?.status === 'failed' && (
        <Text style={styles.error} testID="shortform-error">
          {shortForm.shortForm.errorMessage ?? '영상 생성에 실패했어요'}
        </Text>
      )}
      {shortForm.error && <Text style={styles.error}>{shortForm.error}</Text>}

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
  error: { ...typography.caption, color: color.danger } as const,
  uploadButton: {
    backgroundColor: color.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  uploadDisabled: { opacity: 0.7 },
  uploadLabel: { ...typography.heading, color: color.textInverse } as const,
  progressRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  link: { ...typography.body, color: color.primary } as const,
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
