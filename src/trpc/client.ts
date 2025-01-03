// src/trpc/client.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/api/root';

export const api = createTRPCReact<AppRouter>();

({
  config() {
    return {
      url: '/api/trpc', // URL-ul API-ului tRPC
    };
  },
  ssr: false, // Dacă nu vrei să folosești SSR
});
