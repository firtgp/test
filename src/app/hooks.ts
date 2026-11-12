import {useEffect, useState} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useToast} from '@astryxdesign/core/Toast';
import {backend} from '../data';
import {seedSettings} from '../data/seed';
import {errorText} from '../data/types';

export const keys = {
  settings: ['settings'] as const,
  servers: (all: boolean) => ['servers', all] as const,
  modpacks: ['modpacks'] as const,
  mods: ['mods'] as const,
  news: (all: boolean) => ['news', all] as const,
  rules: ['rules'] as const,
  gallery: ['gallery'] as const,
  account: ['account'] as const,
  sessions: ['sessions'] as const,
  staff: ['staff'] as const,
  audit: ['audit'] as const,
};

export function useSettings() {
  const q = useQuery({queryKey: keys.settings, queryFn: () => backend.getSettings(), staleTime: 60_000});
  return q.data ?? seedSettings;
}

/** Серверы со снимками мониторинга; снимки перечитываются каждые 30 секунд. */
export function useServers(includeUnpublished = false) {
  return useQuery({
    queryKey: keys.servers(includeUnpublished),
    queryFn: () => backend.listServers(includeUnpublished),
    refetchInterval: 30_000,
  });
}
export const useModpacks = () => useQuery({queryKey: keys.modpacks, queryFn: () => backend.listModpacks()});
export const useMods = () => useQuery({queryKey: keys.mods, queryFn: () => backend.listMods()});
export const useNews = (all = false) => useQuery({queryKey: keys.news(all), queryFn: () => backend.listNews(all)});
export const useRules = () => useQuery({queryKey: keys.rules, queryFn: () => backend.getRules()});
export const useGallery = () => useQuery({queryKey: keys.gallery, queryFn: () => backend.listGallery()});
export const useAccount = () => useQuery({queryKey: keys.account, queryFn: () => backend.getAccount()});

/** Текущее время с шагом: нужен, чтобы снимок «старел» на экране без перезагрузки. */
export function useNow(stepMs = 15_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), stepMs);
    return () => clearInterval(id);
  }, [stepMs]);
  return now;
}

export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function useNotify() {
  const showToast = useToast();
  return {
    ok: (body: string) => showToast({body, type: 'info'}),
    fail: (e: unknown) => showToast({body: errorText(e), type: 'error'}),
  };
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (...roots: string[]) => Promise.all(roots.map(r => qc.invalidateQueries({queryKey: [r]})));
}

export function isStaffAdmin(account: {roles: {role: string; server_id: string | null}[]} | null | undefined) {
  return !!account?.roles.some(r => (r.role === 'owner' || r.role === 'admin') && r.server_id === null);
}
