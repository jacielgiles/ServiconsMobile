import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/** Refresca datos cada N ms mientras la pantalla esta visible */
export function useAutoRefresh(load: () => void | Promise<void>, intervalMs = 15_000) {
  const loadRef = useRef(load);
  loadRef.current = load;

  useFocusEffect(
    useCallback(() => {
      void loadRef.current();
      const id = setInterval(() => {
        void loadRef.current();
      }, intervalMs);
      return () => clearInterval(id);
    }, [intervalMs]),
  );
}
