import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { findAttachment } from '@/database/repositories';
import { useThemeColors } from '@/design/theme';
import { resolveMediaUri } from '@/services/media-service';

export function AttachmentImagePreview({ attachmentId, onOpen }: { attachmentId: string; onOpen: () => void }) {
  const colors = useThemeColors();
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    findAttachment(attachmentId)
      .then((attachment) => (attachment ? resolveMediaUri(attachment.localPath) : null))
      .then((resolved) => {
        if (active) setUri(resolved);
      })
      .catch(() => {
        if (active) setUri(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attachmentId]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Imagem anexada. Mantenha pressionado para abrir"
      accessibilityActions={[{ name: 'activate', label: 'Abrir imagem' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'activate') onOpen();
      }}
      onLongPress={onOpen}
      delayLongPress={450}
      style={[styles.frame, { backgroundColor: colors.surfaceMuted }]}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.image} resizeMode="cover" />
      ) : loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <View style={styles.fallback}>
          <Text style={{ color: colors.inkMuted }}>Prévia indisponível</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', height: 160, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
