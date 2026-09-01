import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { color, radius, spacing, typography } from '@vobby/ui-tokens';
import { useLocationImport } from '@/features/trips/use-location-import';

function formatDate(epochS: number): string {
  const d = new Date(epochS * 1000);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

export default function LocationImportScreen() {
  const { files, importing, lastResult, error, pickFile, importSamples } =
    useLocationImport();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>위치 이력 가져오기</Text>
      <Text style={styles.caption}>
        구글 타임라인 내보내기(.json)나 GPX 파일로 여행 궤적을 채워요.
      </Text>

      <Pressable
        style={[styles.button, importing && styles.buttonDisabled]}
        onPress={pickFile}
        disabled={importing}
        testID="pick-file-button"
      >
        {importing ? (
          <ActivityIndicator color={color.textInverse} />
        ) : (
          <Text style={styles.buttonLabel}>파일 선택</Text>
        )}
      </Pressable>

      {__DEV__ && (
        <Pressable
          style={[styles.devButton, importing && styles.buttonDisabled]}
          onPress={importSamples}
          disabled={importing}
          testID="import-samples-button"
        >
          <Text style={styles.devButtonLabel}>[DEV] 부산 샘플 가져오기</Text>
        </Pressable>
      )}

      {lastResult && (
        <Text style={styles.caption} testID="import-summary">
          {lastResult.fileName}: 포인트 {lastResult.pointCount}개 → 여행{' '}
          {lastResult.tripCount}개로 재구성
        </Text>
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.heading}>가져온 파일</Text>
      {files.length === 0 ? (
        <Text style={styles.caption}>아직 가져온 위치 이력이 없어요.</Text>
      ) : (
        <FlatList
          data={files}
          keyExtractor={(f) => f.source_file}
          contentContainerStyle={{ gap: spacing.md }}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`file-${item.source_file}`}>
              <Text style={styles.body}>{item.source_file}</Text>
              <Text style={styles.caption}>
                포인트 {item.point_count}개 · {formatDate(item.from_t)} ~{' '}
                {formatDate(item.to_t)}
              </Text>
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
  title: { ...typography.title, color: color.textPrimary } as const,
  heading: { ...typography.heading, color: color.textPrimary } as const,
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
  devButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: color.border,
  },
  devButtonLabel: { ...typography.body, color: color.textSecondary } as const,
  card: {
    backgroundColor: color.bgSubtle,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: color.border,
  },
});
