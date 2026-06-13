import NextAuth, { type NextAuthConfig } from "next-auth";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";
import Okta from "next-auth/providers/okta";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";
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

const providers: NextAuthConfig["providers"] = [];

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

// Dev-only credentials login: lets a local/test environment sign in as any
// email without setting up Azure AD or Okta. Must never be enabled in
// production — gated behind an explicit opt-in env var.
if (process.env.ENABLE_DEV_LOGIN === "true") {
  providers.push(
    Credentials({
      id: "dev-login",
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        if (!email) return null;
        const name = (credentials?.name as string | undefined)?.trim() || email.split("@")[0];
        const requestedRole = credentials?.role as Role | undefined;
        const role = getEmailRole(email) ?? requestedRole ?? "EMPLOYEE";

        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: { email, name, role },
        });

        return { id: user.id, email: user.email, name: user.name };
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (!user.email) return false;
      // Only apply env-configured role on the very first sign-in (when the
      // account row is being created). Subsequent logins must not override
      // role changes made via the admin UI.
      if (account) {
        const existing = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
        });
        if (!existing) {
          const assignedRole = getEmailRole(user.email);
          if (assignedRole) {
            // The user row is created by the adapter just before this callback;
            // update it immediately to set the correct role.
            await prisma.user.update({
              where: { email: user.email },
              data: { role: assignedRole },
            });
          }
        }
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

