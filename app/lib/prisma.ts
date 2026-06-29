import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// 1. Build configuration safely
const prismaConfig: any = {
  log: ["query", "error", "warn"],
};

// 2. Only append accelerateUrl if the environment variable exists
if (process.env.ACCELERATE_URL) {
  prismaConfig.accelerateUrl = process.env.ACCELERATE_URL;
}

export const prisma = globalForPrisma.prisma || new PrismaClient(prismaConfig);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
