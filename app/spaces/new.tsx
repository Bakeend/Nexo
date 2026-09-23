import { goBackOrHome } from '@/navigation/back';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { Header, Input, PrimaryButton } from '@/components/ui';
import { useSnackbar } from '@/components/visual';
import { createSpace } from '@/database/repositories';
import { playUISound } from '@/services/ui-sound-service';
export default function NewSpace() {
  const styles = useThemeStyles(makeStyles);
  const { showSnackbar } = useSnackbar();
  const [name, setName] = useState('');
  const save = async () => {
    if (!name.trim()) return;
    const space = await createSpace(name);
    playUISound('success-tick');
    showSnackbar('Espaço criado', 'success');
    router.replace({ pathname: '/spaces/[id]', params: { id: space.id } });
  };
  return (
    <SafeAreaView edges={['top']} style={styles.safeRoot}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Header title="Novo espaço" onBack={() => goBackOrHome()} />
        <View style={styles.content}>
          <Input value={name} onChangeText={setName} placeholder="Nome do espaço" autoFocus />
          <View style={styles.bottom}>
            <PrimaryButton title="Criar espaço" onPress={save} disabled={!name.trim()} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    safeRoot: { flex: 1, backgroundColor: colors.surface },
    root: { flex: 1, backgroundColor: colors.surface },
    content: { flex: 1, padding: spacing.lg },
    bottom: { marginTop: 'auto', paddingBottom: spacing.lg },
  });
