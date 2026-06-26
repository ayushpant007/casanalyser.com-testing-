import {
  reports,
  users,
  contactMessages,
  analyses,
  type Report,
  type InsertReport,
  type User,
  type InsertUser,
  type ContactMessage,
  type InsertContactMessage,
  type Analysis,
  type InsertAnalysis,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { randomBytes } from "crypto";

// Generate a cryptographically secure session token
function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export interface IStorage {
  createReport(report: InsertReport): Promise<Report>;
  getReport(id: number): Promise<Report | undefined>;
  getAllReports(): Promise<Report[]>;
  createUser(user: InsertUser): Promise<{ user: User; sessionToken: string }>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserBySessionToken(token: string): Promise<User | undefined>;
  touchUserLastSeen(userId: number): Promise<void>;
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
}

export class DatabaseStorage implements IStorage {
  async createReport(report: InsertReport): Promise<Report> {
    const [newReport] = await db.insert(reports).values(report).returning();
    return newReport;
  }

  async getReport(id: number): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report;
  }

  async getAllReports(): Promise<Report[]> {
    return await db.select().from(reports).orderBy(desc(reports.createdAt));
  }

  async createUser(user: InsertUser): Promise<{ user: User; sessionToken: string }> {
    // Return existing user with a fresh token if email already registered
    const [existing] = await db.select().from(users).where(eq(users.email, user.email));
    if (existing) {
      const token = generateSessionToken();
      const [updated] = await db
        .update(users)
        .set({ sessionToken: token, lastSeen: new Date() })
        .where(eq(users.id, existing.id))
        .returning();
      return { user: updated, sessionToken: token };
    }

    const token = generateSessionToken();
    const [newUser] = await db
      .insert(users)
      .values({ ...user, sessionToken: token, lastSeen: new Date() })
      .returning();
    return { user: newUser, sessionToken: token };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserBySessionToken(token: string): Promise<User | undefined> {
    if (!token) return undefined;
    const [user] = await db.select().from(users).where(eq(users.sessionToken, token));
    return user;
  }

  async touchUserLastSeen(userId: number): Promise<void> {
    await db.update(users).set({ lastSeen: new Date() }).where(eq(users.id, userId));
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [newMessage] = await db.insert(contactMessages).values(message).returning();
    return newMessage;
  }

  async createAnalysis(analysis: InsertAnalysis): Promise<Analysis> {
    const [newAnalysis] = await db.insert(analyses).values(analysis).returning();
    return newAnalysis;
  }
}

export const storage = new DatabaseStorage();
