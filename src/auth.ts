import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/db/client";
import { isAllowedEmail } from "@/lib/env";

const SESSION_DAYS = 180;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [Google],
  // A signed cookie instead of a database session: pages read the user without a database round trip first.
  // It lasts long because answering from a notification uses it without opening the app.
  session: { strategy: "jwt", maxAge: SESSION_DAYS * 24 * 60 * 60 },
  pages: { signIn: "/entrar", error: "/entrar" },
  callbacks: {
    // Check-ins are private: only allow-listed accounts may sign in.
    signIn({ user }) {
      return isAllowedEmail(user.email);
    },
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
