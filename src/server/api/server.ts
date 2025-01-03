// src/server/api/server.ts
import { initTRPC } from '@trpc/server';
import { createContextInner } from './context'; // Asigură-te că fișierul context.ts există
import { projectRouter } from './routers/project'; // Importă routerul pentru proiecte

// Crearea contextului pentru tRPC
const createContext = () => {
  return createContextInner(); // Crearea contextului cu datele necesare
};

type Context = ReturnType<typeof createContext>; // Obținem tipul contextului

// Crearea instanței tRPC
const t = initTRPC.context<Context>().create();

// Crearea router-ului tRPC
export const appRouter = t.router({
  project: projectRouter, // Adaugă router-ul de proiecte
});

// Exportă tipul pentru appRouter pentru a-l folosi în client
export type AppRouter = typeof appRouter;
