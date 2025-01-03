// src/server/api/context.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Definirea unui context pentru tRPC
export const createContextInner = () => {
  return {
    db: prisma,
    user: { userId: 'some-user-id' }, // Sau logica ta de obținere a utilizatorului
  };
};

export type Context = ReturnType<typeof createContextInner>;
