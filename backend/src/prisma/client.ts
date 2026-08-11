import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient instance across the app (recommended by Prisma
// to avoid exhausting DB connections, especially with ts-node-dev hot reload).
const prisma = new PrismaClient();

export default prisma;
