import type {Backend} from './backend';
import {createDemoBackend} from './demoBackend';
import {createSupabaseBackend} from './supabaseBackend';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Без настроенного Supabase сайт работает в явно помеченном демо-режиме. */
export const backend: Backend = url && key ? createSupabaseBackend(url, key) : createDemoBackend();
export const isDemo = backend.mode === 'demo';
