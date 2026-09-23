import { goBackOrHome } from '@/navigation/back';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/ui';
import { spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { formatStorageBytes, getStorageSummary, type StorageCategory, type StorageSummary } from '@/services/storage-service';

const categoryOrder: StorageCategory[] = ['image', 'audio', 'file', 'database', 'backup'];
const categoryLabels: Record<StorageCategory, string> = {
  image: 'Imagens',
  audio: 'Áudios',
  file: 'Arquivos',
  database: 'Notas, tarefas e dados',
  backup: 'Backups exportados',
};
const segmentCount = 72;

function categoryColor(category: StorageCategory, palette: AppColors): string {
  if (category === 'image') return palette.accent;
  if (category === 'audio') return palette.success;
  if (category === 'file') return palette.warning;
  if (category === 'backup') return palette.danger;
  return palette.inkSoft;
}

function StorageRing({ summary }: { summary: StorageSummary }) {
  const palette = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const thresholds: { category: StorageCategory; end: number }[] = [];
  let cumulative = 0;
  for (const category of categoryOrder) {
    cumulative += summary.bytes[category];
    thresholds.push({ category, end: cumulative });
  }
  return (
    <View style={styles.ring} accessibilityRole="text" accessibilityLabel={`Dados do Nexo: ${formatStorageBytes(summary.totalBytes)}`}>
      {Array.from({ length: segmentCount }, (_, index) => {
        const position = ((index + 0.5) / segmentCount) * summary.totalBytes;
        const category = thresholds.find((entry) => position < entry.end)?.category ?? 'database';
        const segmentColor = summary.totalBytes > 0 ? categoryColor(category, palette) : palette.line;
        return (
          <View
            key={index}
            pointerEvents="none"
            style={[styles.segmentFrame, { transform: [{ rotate: `${index * (360 / segmentCount)}deg` }] }]}
          >
            <View style={[styles.segment, { backgroundColor: segmentColor }]} />
          </View>
        );
      })}
      <View style={styles.ringCenter} pointerEvents="none">
        <Text style={styles.totalLabel}>DADOS MEDIDOS</Text>
        <Text style={styles.totalValue}>{formatStorageBytes(summary.totalBytes)}</Text>
      </View>
    </View>
  );
}

export default function Storage() {
  const palette = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const [summary, setSummary] = useState<StorageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setSummary(await getStorageSummary());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Header title="Armazenamento" onBack={() => goBackOrHome()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introRow}>
          <Text style={styles.heading}>Uso estimado do Nexo</Text>
          <Pressable onPress={() => void load()} accessibilityRole="button" accessibilityLabel="Atualizar armazenamento" hitSlop={10}>
            <Ionicons name="refresh-outline" size={22} color={palette.inkSoft} />
          </Pressable>
        </View>
        <Text style={styles.description}>Veja quanto espaço seus dados e anexos conhecidos ocupam neste dispositivo.</Text>
        {loading && !summary ? <ActivityIndicator style={styles.loading} color={palette.accent} /> : null}
        {summary ? (
          <>
            <StorageRing summary={summary} />
            {loading ? <ActivityIndicator color={palette.accent} /> : null}
            <View style={styles.breakdown}>
              {categoryOrder.map((category) => (
                <View key={category} style={styles.categoryRow}>
                  <View style={[styles.swatch, { backgroundColor: categoryColor(category, palette) }]} />
                  <Text style={styles.categoryLabel}>{categoryLabels[category]}</Text>
                  <Text style={styles.categoryValue}>{formatStorageBytes(summary.bytes[category])}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.detail}>{summary.attachmentCount} anexos registrados, inclusive itens na Lixeira.</Text>
            {summary.unavailableCount > 0 ? (
              <Text style={styles.note}>{summary.unavailableCount} arquivo(s) ou dado(s) indisponível(is) não entram no total.</Text>
            ) : null}
            {summary.freeDeviceBytes !== null && summary.totalDeviceBytes !== null ? (
              <View style={styles.deviceCard}>
                <Text style={styles.deviceTitle}>No dispositivo</Text>
                <Text style={styles.deviceText}>
                  {formatStorageBytes(summary.freeDeviceBytes)} livres de {formatStorageBytes(summary.totalDeviceBytes)}
                </Text>
              </View>
            ) : null}
            <Text style={styles.note}>
              O círculo mostra os dados medidos do Nexo. O espaço livre do dispositivo inclui outros aplicativos e arquivos.
            </Text>
          </>
        ) : null}
        {error ? <Text style={styles.error}>Não foi possível medir o armazenamento. Toque em atualizar para tentar novamente.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (palette: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.surface },
    content: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
    introRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heading: { ...typography.heading, color: palette.ink },
    description: { ...typography.body, color: palette.inkSoft },
    loading: { marginTop: spacing.xxxl },
    ring: { width: 208, height: 208, alignSelf: 'center', marginVertical: spacing.lg, alignItems: 'center', justifyContent: 'center' },
    segmentFrame: { position: 'absolute', top: 0, left: 0, width: 208, height: 208, alignItems: 'center' },
    segment: { width: 7, height: 18, marginTop: 2, borderRadius: 4 },
    ringCenter: { alignItems: 'center', justifyContent: 'center' },
    totalLabel: { ...typography.meta, color: palette.inkMuted, letterSpacing: 1 },
    totalValue: { ...typography.title, color: palette.ink, marginTop: spacing.xs },
    breakdown: { gap: spacing.sm },
    categoryRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.line,
    },
    swatch: { width: 10, height: 10, borderRadius: 5 },
    categoryLabel: { ...typography.body, color: palette.ink, flex: 1 },
    categoryValue: { ...typography.bodyStrong, color: palette.inkSoft },
    detail: { ...typography.caption, color: palette.inkSoft },
    note: { ...typography.caption, color: palette.inkMuted },
    deviceCard: { backgroundColor: palette.surfaceMuted, borderRadius: 12, padding: spacing.lg, gap: spacing.xs },
    deviceTitle: { ...typography.bodyStrong, color: palette.ink },
    deviceText: { ...typography.body, color: palette.inkSoft },
    error: { ...typography.body, color: palette.danger },
  });
