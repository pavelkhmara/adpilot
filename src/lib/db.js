"use strict";
import { PrismaClient } from '@prisma/client';
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
// var client_1 = require("@prisma/client");
var client_1 = PrismaClient;
var globalForPrisma = global;
if (!process.env.DATABASE_URL) {
    // В DEV: понятная ошибка. В PROD лучше не логировать URL.
    console.warn("[DB] DATABASE_URL is not set. Check .env.local / server environment variables.");
}
exports.prisma = (_a = globalForPrisma.prisma) !== null && _a !== void 0 ? _a : new client_1.PrismaClient({ log: ["error", "warn"] });
if (process.env.NODE_ENV !== "production")
    globalForPrisma.prisma = exports.prisma;
