import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import AdminClientPage from './AdminClientPage';

export default async function AdminPage() {
  const session = await auth();
  
  if (!session?.user?.id || session.user.platformRole !== 'admin') {
    redirect('/dashboard');
  }

  await dbConnect();

  // Fetch all users on initial load
  const users = await User.find({}).sort({ createdAt: -1 }).lean();

  const serializedUsers = users.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role || 'user',
    mfaEnabled: !!u.mfaEnabled,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    lastLoginIp: u.lastLoginIp || null,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <AdminClientPage
      initialUsers={serializedUsers}
      currentUserEmail={session.user.email!}
      currentUserId={session.user.id}
    />
  );
}
