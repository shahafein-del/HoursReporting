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

const providers = [];

if (
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
  process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET
) {
  providers.push(
    MicrosoftEntraId({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID
        ? `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`
        : undefined,
    })
  );
}

if (
  process.env.AUTH_OKTA_ID &&
  process.env.AUTH_OKTA_SECRET &&
  process.env.AUTH_OKTA_ISSUER
) {
  providers.push(
    Okta({
      clientId: process.env.AUTH_OKTA_ID,
      clientSecret: process.env.AUTH_OKTA_SECRET,
      issuer: process.env.AUTH_OKTA_ISSUER,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  session: {
    // JWT strategy: sessions stored in signed cookie, edge-runtime compatible
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const assignedRole = getEmailRole(user.email);
      if (assignedRole) {
        await prisma.user.update({
          where: { email: user.email },
          data: { role: assignedRole },
        });
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      // Populate token on first sign-in or explicit update
      if (user?.email || trigger === "update") {
        const email = (user?.email ?? token.email) as string | undefined;
        if (email) {
          const dbUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true, role: true, locale: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.locale = dbUser.locale;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as Role) ?? "EMPLOYEE";
        session.user.locale = (token.locale as string) ?? "en";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
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

