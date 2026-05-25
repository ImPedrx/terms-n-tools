import { useCallback, useEffect, useState } from 'react';

export type KioskNoticeColor = 'info' | 'warning' | 'success' | 'destructive';

export interface KioskNotice {
  id: string;
  title: string;
  message: string;
  color: KioskNoticeColor;
}

export interface KioskConfig {
  notices: KioskNotice[];
  intervalSeconds: number;
}

const STORAGE_KEY = 'kiosk-config-v1';

const DEFAULT_CONFIG: KioskConfig = {
  notices: [],
  intervalSeconds: 8,
};

function readConfig(): KioskConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      notices: Array.isArray(parsed.notices) ? parsed.notices : [],
      intervalSeconds:
        typeof parsed.intervalSeconds === 'number' && parsed.intervalSeconds >= 3
          ? parsed.intervalSeconds
          : DEFAULT_CONFIG.intervalSeconds,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function useKioskNotices() {
  const [config, setConfig] = useState<KioskConfig>(() => readConfig());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setConfig(readConfig());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persist = useCallback((next: KioskConfig) => {
    setConfig(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addNotice = useCallback(
    (notice: Omit<KioskNotice, 'id'>) => {
      const id = `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      persist({ ...config, notices: [...config.notices, { ...notice, id }] });
    },
    [config, persist],
  );

  const updateNotice = useCallback(
    (id: string, patch: Partial<Omit<KioskNotice, 'id'>>) => {
      persist({
        ...config,
        notices: config.notices.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      });
    },
    [config, persist],
  );

  const removeNotice = useCallback(
    (id: string) => {
      persist({ ...config, notices: config.notices.filter((n) => n.id !== id) });
    },
    [config, persist],
  );

  const setInterval = useCallback(
    (seconds: number) => {
      persist({ ...config, intervalSeconds: Math.max(3, Math.min(60, seconds)) });
    },
    [config, persist],
  );

  return { config, addNotice, updateNotice, removeNotice, setInterval };
}
