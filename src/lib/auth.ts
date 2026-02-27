import NextAuth from "next-auth";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";
import Okta from "next-auth/providers/okta";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import type { Role } from "@/generated/prisma";

function getEmailRole(email: string): Role | null {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const managerEmails = (process.env.MANAGER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.includes(email.toLowerCase())) return "ADMIN";
  if (managerEmails.includes(email.toLowerCase())) return "MANAGER";
  return null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    MicrosoftEntraId({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID
        ? `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`
        : undefined,
    }),
    Okta({
      clientId: process.env.AUTH_OKTA_ID!,
      clientSecret: process.env.AUTH_OKTA_SECRET!,
      issuer: process.env.AUTH_OKTA_ISSUER!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      // Assign role from env-configured email lists on first login
      const assignedRole = getEmailRole(user.email);
      if (assignedRole) {
        await prisma.user.update({
          where: { email: user.email },
          data: { role: assignedRole },
        });
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, locale: true, id: true },
        });
        session.user.id = user.id;
        session.user.role = dbUser?.role ?? "EMPLOYEE";
        session.user.locale = dbUser?.locale ?? "en";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "database",
  },
});

// Augment next-auth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      locale: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
