import { AppRouter } from "@/server/api/root";
import { inferRouterOutputs } from "@trpc/server";



export type RouterOutputs = inferRouterOutputs<AppRouter>;
