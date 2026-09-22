import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/design/theme';
import { Header, Input, PrimaryButton } from '@/components/ui';
import { createSpace } from '@/database/repositories';
export default function NewSpace() {
  const [name, setName] = useState('');
  const save = async () => {
    if (!name.trim()) return;
    const space = await createSpace(name);
    router.replace({ pathname: '/spaces/[id]', params: { id: space.id } });
  };
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Novo espaço" onBack={() => router.back()} />
      <View style={styles.content}>
        <Input value={name} onChangeText={setName} placeholder="Nome do espaço" autoFocus />
        <View style={styles.bottom}>
          <PrimaryButton title="Criar espaço" onPress={save} disabled={!name.trim()} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { flex: 1, padding: spacing.lg },
  bottom: { marginTop: 'auto', paddingBottom: spacing.lg },
});
