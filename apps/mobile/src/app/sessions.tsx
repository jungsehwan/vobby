import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { color, radius, spacing, typography } from '@vobby/ui-tokens';
import {
  countPoints,
  listFinishedSessions,
} from '@/features/recording/recording-db';

export default function SessionsScreen() {
  const sessions = listFinishedSessions();

  return (
    <View style={styles.container}>
      {sessions.length === 0 ? (
        <Text style={styles.caption}>완료된 기록이 없습니다.</Text>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ gap: spacing.md }}
          renderItem={({ item }) => (
            <Link href={{ pathname: '/session/[id]', params: { id: item.id } }} asChild>
              <Pressable style={styles.card} testID={`session-${item.id}`}>
                <Text style={styles.body}>
                  {new Date(item.started_at * 1000).toLocaleString('ko-KR')}
                </Text>
                <Text style={styles.caption}>
                  포인트 {countPoints(item.id)}개 ·{' '}
                  {item.ended_at
                    ? `${Math.round((item.ended_at - item.started_at) / 60)}분`
                    : '-'}
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
  container: { flex: 1, backgroundColor: color.bgBase, padding: spacing.lg },
  card: {
    backgroundColor: color.bgSubtle,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: color.border,
  },
  body: { ...typography.body, color: color.textPrimary } as const,
  caption: { ...typography.caption, color: color.textSecondary } as const,
});
