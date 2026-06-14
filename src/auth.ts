import NextAuth, { DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GithubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      activeOrgId: string | null;
      role: string | null;
      platformRole: 'user' | 'admin';
    } & DefaultSession['user'];
  }

  interface User {
    id?: string;
    activeOrgId?: string | null;
    role?: string | null;
    platformRole?: 'user' | 'admin';
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    activeOrgId: string | null;
    role: string | null;
    platformRole: 'user' | 'admin' | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'dummy',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy',
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || 'dummy',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'dummy',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Dynamically import to ensure Edge environment compatibility for middleware
        const dbConnect = (await import('@/lib/db')).default;
        const User = (await import('@/models/User')).default;
        const argon2 = (await import('argon2')).default;

        await dbConnect();

        const user = await User.findOne({ email: String(credentials.email).toLowerCase() });
        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await argon2.verify(user.passwordHash, String(credentials.password));
        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Dynamically import database components for Edge routing safety
      const dbConnect = (await import('@/lib/db')).default;
      const OrgMembership = (await import('@/models/OrgMembership')).default;
      const User = (await import('@/models/User')).default;

      await dbConnect();

      if (user) {
        const mongoose = (await import('mongoose')).default;
        const isValidObjectId = mongoose.Types.ObjectId.isValid(user.id || '');
        let dbUser;

        if (isValidObjectId) {
          token.id = user.id!;
          dbUser = await User.findById(user.id);
        } else {
          dbUser = await User.findOne({ email: user.email?.toLowerCase() });
          if (!dbUser) {
            dbUser = await User.create({
              name: user.name || 'OAuth User',
              email: user.email?.toLowerCase(),
              avatarUrl: user.image || null,
              emailVerified: new Date(),
            });
          }
          token.id = dbUser._id.toString();
        }
        token.platformRole = dbUser?.role || 'user';
      }

      // Ensure platformRole is populated in the token (even for existing sessions)
      if (token.id && !token.platformRole) {
        const dbUser = await User.findById(token.id);
        token.platformRole = dbUser?.role || 'user';
      }

      // Handle session updates (dynamic tenant changing)
      if (trigger === 'update' && session?.activeOrgId) {
        const membership = await OrgMembership.findOne({
          userId: token.id,
          orgId: session.activeOrgId,
        });

        if (membership) {
          token.activeOrgId = session.activeOrgId;
          token.role = membership.role;
        }
      }

      // If activeOrgId is not set, resolve it
      if (!token.activeOrgId) {
        const primaryMembership = await OrgMembership.findOne({ userId: token.id }).sort({ createdAt: 1 });
        if (primaryMembership) {
          token.activeOrgId = primaryMembership.orgId.toString();
          token.role = primaryMembership.role;
        } else {
          token.activeOrgId = null;
          token.role = null;
        }
      } else {
        // Confirm membership still active and verify correct role
        const currentMembership = await OrgMembership.findOne({
          userId: token.id,
          orgId: token.activeOrgId,
        });
        if (currentMembership) {
          token.role = currentMembership.role;
        } else {
          // If membership was revoked, attempt to resolve back to first active membership
          const backupMembership = await OrgMembership.findOne({ userId: token.id }).sort({ createdAt: 1 });
          if (backupMembership) {
            token.activeOrgId = backupMembership.orgId.toString();
            token.role = backupMembership.role;
          } else {
            token.activeOrgId = null;
            token.role = null;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.activeOrgId = token.activeOrgId;
        session.user.role = token.role;
        session.user.platformRole = token.platformRole || 'user';
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    newUser: '/register',
  },
});
