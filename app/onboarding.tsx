import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Animated, ImageSourcePropType, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setSetting } from '@/database/repositories';
import { colors, radius, spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { AnimatedPressable } from '@/motion/AnimatedPressable';
import { motionDuration, motionScale, motionSpring } from '@/motion/tokens';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { playUISound } from '@/services/ui-sound-service';

type OnboardingPage = {
  eyebrow: string;
  title: string;
  text: string;
  image: ImageSourcePropType;
};

const pages: OnboardingPage[] = [
  {
    eyebrow: 'BEM-VINDO AO NEXO',
    title: 'Sua rotina,\nmais leve.',
    text: 'Um lugar simples para guardar ideias, tarefas, lembretes e arquivos sem perder tempo organizando tudo.',
    image: require('../assets/onboarding/01-caminho.png'),
  },
  {
    eyebrow: 'UM ESPAÇO SÓ SEU',
    title: 'Abra. Respire.\nContinue.',
    text: 'Tudo foi pensado para você registrar o que importa com calma e encontrar depois sem esforço.',
    image: require('../assets/onboarding/02-pausa.png'),
  },
  {
    eyebrow: 'ANOTAÇÕES',
    title: 'Guarde o que\nvale lembrar.',
    text: 'Crie notas para estudos, ideias, listas e qualquer informação que você queira manter por perto.',
    image: require('../assets/onboarding/03-notas.png'),
  },
  {
    eyebrow: 'ÁUDIO',
    title: 'Quando escrever\nnão for o melhor.',
    text: 'Grave uma ideia, uma explicação ou um lembrete em áudio e deixe tudo junto da sua nota.',
    image: require('../assets/onboarding/04-audio.png'),
  },
  {
    eyebrow: 'ARQUIVOS',
    title: 'Seu conteúdo\nfica junto.',
    text: 'Adicione imagens e documentos às suas notas para não precisar procurar cada coisa em um lugar diferente.',
    image: require('../assets/onboarding/05-arquivos.png'),
  },
  {
    eyebrow: 'LEMBRETES',
    title: 'O Nexo lembra\ncom você.',
    text: 'Crie lembretes no momento em que precisar e siga o seu dia sem depender da memória.',
    image: require('../assets/onboarding/06-lembretes.png'),
  },
  {
    eyebrow: 'CAPTURA RÁPIDA',
    title: 'Anote antes\nque passe.',
    text: 'Uma ideia apareceu? Registre em segundos. Você pode organizar com mais calma depois.',
    image: require('../assets/onboarding/07-captura.png'),
  },
  {
    eyebrow: 'ORGANIZAÇÃO',
    title: 'Organize sem\ncomplicar.',
    text: 'Notas, tarefas e arquivos ficam fáceis de entender, sem transformar organização em mais uma tarefa.',
    image: require('../assets/onboarding/08-organizacao.png'),
  },
  {
    eyebrow: 'SEU RITMO',
    title: 'Continue de\nonde parou.',
    text: 'Abra o Nexo e encontre o que estava fazendo com uma interface limpa e direta.',
    image: require('../assets/onboarding/09-encontre.png'),
  },
  {
    eyebrow: 'PRONTO PARA USAR',
    title: 'Tudo se conecta\nno Nexo.',
    text: 'Notas, tarefas, lembretes e arquivos no mesmo fluxo. Agora é só começar do seu jeito.',
    image: require('../assets/onboarding/10-tudo-junto.png'),
  },
];

function OnboardingIndicator({ selected, active }: { selected: boolean; active: boolean }) {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const widthProgress = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const fillProgress = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion) {
      widthProgress.setValue(selected ? 1 : 0);
      fillProgress.setValue(active ? 1 : 0);
      return;
    }
    Animated.parallel([
      Animated.spring(widthProgress, { toValue: selected ? 1 : 0, ...motionSpring.selection, useNativeDriver: false }),
      Animated.timing(fillProgress, { toValue: active ? 1 : 0, duration: motionDuration.normal, useNativeDriver: false }),
    ]).start();
  }, [active, fillProgress, reducedMotion, selected, widthProgress]);
  const width = widthProgress.interpolate({ inputRange: [0, 1], outputRange: [6, 18] });
  const backgroundColor = fillProgress.interpolate({ inputRange: [0, 1], outputRange: [colors.line, colors.accent] });
  return <Animated.View style={[styles.progressSegment, { width, backgroundColor } as never]} />;
}

export default function Onboarding() {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const [page, setPage] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const { height, width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const direction = useRef(1);
  const contentTranslateX = useRef(new Animated.Value(22)).current;
  const titleProgress = useRef(new Animated.Value(0)).current;
  const textProgress = useRef(new Animated.Value(0)).current;
  const visualProgress = useRef(new Animated.Value(0)).current;
  const confirmationScale = useRef(new Animated.Value(1)).current;
  const current = pages[page];

  const imageWidth = Math.min(width - spacing.xl * 2, 360);
  const compact = height < 760;
  const imageHeight = compact ? Math.min(Math.max(height * 0.25, 140), 190) : Math.min(Math.max(height * 0.34, 235), 320);

  useEffect(() => {
    const duration = reducedMotion ? 100 : 190;
    contentTranslateX.setValue(reducedMotion ? 0 : direction.current * 36);
    titleProgress.setValue(0);
    textProgress.setValue(0);
    visualProgress.setValue(0);
    Animated.parallel([
      Animated.timing(contentTranslateX, { toValue: 0, duration, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(titleProgress, { toValue: 1, duration: reducedMotion ? 100 : 175, useNativeDriver: Platform.OS !== 'web' }),
      Animated.sequence([
        Animated.delay(reducedMotion ? 0 : 45),
        Animated.timing(textProgress, { toValue: 1, duration: reducedMotion ? 100 : 165, useNativeDriver: Platform.OS !== 'web' }),
      ]),
      Animated.sequence([
        Animated.delay(reducedMotion ? 0 : 90),
        Animated.timing(visualProgress, { toValue: 1, duration: reducedMotion ? 100 : 160, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    ]).start();
  }, [contentTranslateX, page, reducedMotion, textProgress, titleProgress, visualProgress]);

  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    confirmationScale.setValue(reducedMotion ? 1 : 0.7);
    try {
      await setSetting('onboarding_completed', 'true');
      playUISound('success-tick');
      Animated.spring(confirmationScale, { toValue: 1, ...motionSpring.selection, useNativeDriver: Platform.OS !== 'web' }).start();
      setTimeout(() => router.replace('/home'), reducedMotion ? 100 : 260);
    } catch {
      confirmationScale.setValue(1);
      setFinishing(false);
    }
  };

  const changePage = (nextPage: number) => {
    if (transitioning || nextPage < 0 || nextPage >= pages.length) return;
    direction.current = nextPage > page ? 1 : -1;
    setTransitioning(true);
    const duration = reducedMotion ? 80 : 90;
    Animated.parallel([
      Animated.timing(contentTranslateX, { toValue: reducedMotion ? 0 : -direction.current * 36, duration, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(titleProgress, { toValue: 0, duration, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(textProgress, { toValue: 0, duration, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(visualProgress, { toValue: 0, duration, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(({ finished: didFinish }) => {
      if (didFinish) setPage(nextPage);
      setTransitioning(false);
    });
  };

  const next = () => {
    if (page === pages.length - 1) {
      void finish();
      return;
    }
    changePage(page + 1);
  };

  const previous = () => {
    if (page > 0) changePage(page - 1);
  };

  const buttonLabel = page === 0 ? 'Conhecer o Nexo' : page === pages.length - 1 ? 'Começar a usar' : 'Continuar';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <View style={styles.topBar}>
        <View style={styles.topBarSide}>
          {page > 0 ? (
            <AnimatedPressable accessibilityLabel="Voltar" hitSlop={10} onPress={previous} style={styles.iconButton} pressedScale={0.92}>
              <Ionicons name="arrow-back" size={20} color={colors.ink} />
            </AnimatedPressable>
          ) : null}
        </View>

        <Text style={styles.stepLabel}>
          {String(page + 1).padStart(2, '0')} / {String(pages.length).padStart(2, '0')}
        </Text>

        <View style={[styles.topBarSide, styles.topBarSideRight]}>
          <AnimatedPressable onPress={() => void finish()} hitSlop={10} style={styles.skipButton} pressedScale={motionScale.secondary}>
            <Text style={styles.skip}>Pular</Text>
          </AnimatedPressable>
        </View>
      </View>

      <Animated.View
        key={`visual-${page}`}
        style={[
          styles.visual,
          compact && styles.visualCompact,
          {
            opacity: visualProgress,
            transform: [
              {
                translateY: visualProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 0],
                }),
              },
              { translateX: contentTranslateX },
            ],
          },
        ]}
      >
        <Animated.Image source={current.image} resizeMode="contain" style={{ width: imageWidth, height: imageHeight }} />
      </Animated.View>

      <Animated.View
        key={`copy-${page}`}
        style={[
          styles.copy,
          compact && styles.copyCompact,
          {
            transform: [{ translateX: contentTranslateX }],
          },
        ]}
      >
        <Animated.View
          style={{
            opacity: titleProgress,
            transform: [{ translateY: titleProgress.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
          }}
        >
          <Text style={styles.eyebrow}>{current.eyebrow}</Text>
          <Text style={styles.title}>{current.title}</Text>
        </Animated.View>
        <Animated.Text
          style={[
            styles.subtitle,
            { opacity: textProgress, transform: [{ translateY: textProgress.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }) }] },
          ]}
        >
          {current.text}
        </Animated.Text>
      </Animated.View>

      <View style={styles.bottom}>
        <View style={styles.progress} accessibilityLabel={`Etapa ${page + 1} de ${pages.length}`}>
          {pages.map((_, index) => (
            <OnboardingIndicator key={index} selected={index === page} active={index <= page} />
          ))}
        </View>

        <AnimatedPressable
          onPress={next}
          disabled={transitioning || finishing}
          style={styles.primaryButton}
          pressedScale={motionScale.primary}
        >
          <Text style={styles.primaryButtonText}>{finishing ? 'Tudo pronto' : buttonLabel}</Text>
          <Animated.View style={{ transform: [{ scale: confirmationScale }] }}>
            <Ionicons name={finishing || page === pages.length - 1 ? 'checkmark' : 'arrow-forward'} size={19} color={colors.onInk} />
          </Animated.View>
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.xl,
    },
    topBar: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    topBarSide: {
      width: 72,
      alignItems: 'flex-start',
    },
    topBarSideRight: {
      alignItems: 'flex-end',
    },
    iconButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
    },
    skipButton: { minHeight: 36, justifyContent: 'center' },
    skip: { ...typography.caption, color: colors.inkSoft, fontWeight: '600' },
    stepLabel: {
      ...typography.caption,
      color: colors.inkSoft,
      fontSize: 11,
      letterSpacing: 0.8,
      fontWeight: '700',
    },
    visual: {
      flex: 1,
      minHeight: 220,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: spacing.sm,
    },
    visualCompact: { minHeight: 150, paddingTop: 0 },
    copy: {
      minHeight: 202,
      paddingBottom: spacing.lg,
    },
    copyCompact: { minHeight: 0, paddingBottom: spacing.sm },
    eyebrow: {
      ...typography.caption,
      color: colors.accent,
      fontSize: 11,
      lineHeight: 15,
      letterSpacing: 1.1,
      fontWeight: '800',
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.display,
      color: colors.ink,
      fontSize: 32,
      lineHeight: 35,
      letterSpacing: -0.9,
    },
    subtitle: {
      ...typography.body,
      color: colors.inkSoft,
      marginTop: spacing.md,
      maxWidth: 335,
      lineHeight: 21,
    },
    bottom: { paddingBottom: spacing.sm },
    progress: {
      height: 28,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      width: 124,
    },
    progressSegment: {
      width: 6,
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.line,
    },
    primaryButton: {
      height: 54,
      borderRadius: radius.md,
      backgroundColor: colors.ink,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    primaryButtonPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.995 }],
    },
    primaryButtonText: { ...typography.bodyStrong, color: colors.onInk },
  });
