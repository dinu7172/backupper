export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const dbConnect = (await import('@/lib/db')).default;
    const User = (await import('@/models/User')).default;
    const argon2 = (await import('argon2')).default;

    try {
      await dbConnect();

      const adminEmail = (process.env.SUPERADMIN_EMAIL || 'admin@backupper.dev').toLowerCase();
      const adminPassword = process.env.SUPERADMIN_PASSWORD || 'admin123';
      const adminName = process.env.SUPERADMIN_NAME || 'Super Admin';

      const existingAdmin = await User.findOne({ role: 'admin' });
      if (!existingAdmin) {
        // Hash the password using Argon2id with OWASP-recommended parameters
        const passwordHash = await argon2.hash(adminPassword, {
          type: argon2.argon2id,
          memoryCost: 65536, // 64 MB
          timeCost: 3, // 3 iterations
          parallelism: 4, // 4 lanes
        });

        await User.create({
          email: adminEmail,
          name: adminName,
          passwordHash,
          role: 'admin',
          emailVerified: new Date(),
        });
        console.log(`[Instrumentation] Super Admin user created successfully with email: ${adminEmail}`);
      } else {
        console.log(`[Instrumentation] Super Admin user already exists.`);
      }
    } catch (error) {
      console.error('[Instrumentation] Error seeding Super Admin user:', error);
    }
  }
}
