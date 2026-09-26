import { router } from 'expo-router';
import { useIncomingShare } from 'expo-sharing';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useSnackbar } from '@/components/visual';
import { getIncomingShareSignature, ingestIncomingShare, isBinarySharePayload } from '@/services/incoming-share-service';

const metadataWaitMs = 2000;

export function IncomingShareHandler() {
  if (Platform.OS !== 'android') return null;
  return <AndroidIncomingShareHandler />;
}

function AndroidIncomingShareHandler() {
  const { sharedPayloads, resolvedSharedPayloads, isResolving, error, clearSharedPayloads, refreshSharePayloads } = useIncomingShare();
  const { showSnackbar } = useSnackbar();
  const latestShareRef = useRef({ sharedPayloads, resolvedSharedPayloads });
  const processedSignatureRef = useRef<string | null>(null);
  const resolutionObservedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduledSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    latestShareRef.current = { sharedPayloads, resolvedSharedPayloads };
  }, [resolvedSharedPayloads, sharedPayloads]);

  useEffect(() => {
    if (!sharedPayloads.length) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      scheduledSignatureRef.current = null;
      processedSignatureRef.current = null;
      resolutionObservedRef.current = false;
      return;
    }

    const signature = getIncomingShareSignature(sharedPayloads);
    if (processedSignatureRef.current === signature) return;
    const hasBinaryPayload = sharedPayloads.some(isBinarySharePayload);
    if (isResolving) resolutionObservedRef.current = true;

    const startImport = (resolvedPayloads = latestShareRef.current.resolvedSharedPayloads) => {
      if (processedSignatureRef.current === signature) return;
      processedSignatureRef.current = signature;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      void ingestIncomingShare(latestShareRef.current.sharedPayloads, resolvedPayloads)
        .then((result) => {
          clearSharedPayloads();
          refreshSharePayloads();
          if (result.imported > 0) {
            const importedMessage =
              result.imported === 1 ? '1 item recebido na Caixa de entrada.' : `${result.imported} itens recebidos na Caixa de entrada.`;
            const message = result.failed > 0 ? `${importedMessage} ${result.failed} falhou.` : importedMessage;
            showSnackbar(message, result.failed > 0 ? 'info' : 'success');
            router.replace('/inbox');
          } else {
            showSnackbar('Não foi possível importar o conteúdo compartilhado.', 'error');
          }
        })
        .catch(() => {
          clearSharedPayloads();
          refreshSharePayloads();
          showSnackbar('Não foi possível importar o conteúdo compartilhado.', 'error');
        });
    };

    if (!hasBinaryPayload) {
      startImport([]);
      return;
    }

    const metadataReady = Boolean(error) || resolvedSharedPayloads.length > 0 || (resolutionObservedRef.current && !isResolving);
    if (metadataReady) {
      startImport(resolvedSharedPayloads);
      return;
    }

    if (scheduledSignatureRef.current !== signature) {
      if (timerRef.current) clearTimeout(timerRef.current);
      scheduledSignatureRef.current = signature;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        startImport(latestShareRef.current.resolvedSharedPayloads);
      }, metadataWaitMs);
    }
  }, [clearSharedPayloads, error, isResolving, refreshSharePayloads, resolvedSharedPayloads, sharedPayloads, showSnackbar]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return null;
}
