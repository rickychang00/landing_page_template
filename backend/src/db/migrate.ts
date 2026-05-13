import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import bcrypt from 'bcryptjs';
import * as schema from './schema';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations complete.');

  const email = process.env.ADMIN_EMAIL ?? 'admin@admin.com';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin1234!';

  const existing = await db.query.adminUsers.findFirst({
    where: (u, { eq }) => eq(u.email, email),
  });

  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 12);
    await db.insert(schema.adminUsers).values({ email, passwordHash });
    console.log(`Admin user seeded: ${email}`);
  } else {
    console.log('Admin user already exists, skipping seed.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
