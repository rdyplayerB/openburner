"use client";

import { useMemo } from 'react';
import { getAppConfig, AppConfig } from '@/lib/config/environment';

export function useEnvironment(): AppConfig {
  return useMemo(() => getAppConfig(), []);
}
