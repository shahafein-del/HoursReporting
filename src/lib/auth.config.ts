import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma";

/**
 * Edge-safe auth config shared by the full NextAuth setup (`./auth.ts`) and
 * the middleware. It must not import anything that pulls in `./prisma`
 * (the `pg` driver requires Node's `crypto`, which isn't available in the
 * Edge runtime that middleware executes in).
 */
export const authConfig: NextAuthConfig = {
  providers: [],
  session: {
    strategy: "jwt",
  },
  callbacks: {
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
};
