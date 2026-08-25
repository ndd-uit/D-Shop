import 'dotenv/config'
import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from '@prisma/adapter-pg'

// Load environment variables from .env file
const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});
// Create a new PrismaClient instance with the PostgreSQL adapter
const prisma = new PrismaClient({
    adapter,
});

export default prisma;