import { PrismaClient } from '@prisma/client';

//! INSTANCE PRISMA THAT WE CAN USE IN FUNCTIONS FILES  
const db = new PrismaClient();

export { db };
