import "dotenv/config";
import pg from "pg";
import crypto from "node:crypto";
import argon2 from "argon2";

const userPool = new pg.Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "react-node",
});

export interface SeedUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "CUSTOMER" | "ADMIN" | "SUPPORT";
  isActive?: boolean;
}

export const USERS_DATA: SeedUser[] = [
  // 3 Customers
  {
    email: "customer1@example.com",
    password: "Password123!",
    firstName: "Alice",
    lastName: "Smith",
    role: "CUSTOMER",
    isActive: true,
  },
  {
    email: "customer2@example.com",
    password: "Password123!",
    firstName: "Bob",
    lastName: "Jones",
    role: "CUSTOMER",
    isActive: true,
  },
  {
    email: "customer3@example.com",
    password: "Password123!",
    firstName: "Charlie",
    lastName: "Brown",
    role: "CUSTOMER",
    isActive: true,
  },
  // 1 Admin
  {
    email: "admin@example.com",
    password: "Password123!",
    firstName: "Eleanor",
    lastName: "Vance",
    role: "ADMIN",
    isActive: true,
  },
  // 1 Support
  {
    email: "support@example.com",
    password: "Password123!",
    firstName: "Sam",
    lastName: "Taylor",
    role: "SUPPORT",
    isActive: true,
  },
];

async function seed() {
  console.log(`Starting seed of ${USERS_DATA.length} users...`);

  const now = Date.now();
  let insertedCount = 0;

  for (let i = 0; i < USERS_DATA.length; i++) {
    const user = USERS_DATA[i];
    if (!user) continue;

    const createdAt = new Date(now - (USERS_DATA.length - i) * 60000);
    const updatedAt = new Date();

    const passwordHash = await argon2.hash(user.password, {
      type: argon2.argon2id,
    });

    const query = `
      INSERT INTO users (
        id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        updated_at = EXCLUDED.updated_at
      RETURNING id, email, first_name, last_name, role, is_active;
    `;

    const userId = crypto.randomUUID();
    const result = await userPool.query(query, [
      userId,
      user.email.toLowerCase(),
      passwordHash,
      user.firstName,
      user.lastName,
      user.role,
      user.isActive ?? true,
      createdAt,
      updatedAt,
    ]);

    const savedUser = result.rows[0];
    console.log(`✓ Seeded user: ${savedUser.email} (${savedUser.role})`);
    insertedCount++;
  }

  const roleCounts = USERS_DATA.reduce(
    (acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const breakdown = Object.entries(roleCounts)
    .map(([role, count]) => `${count} ${role}`)
    .join(", ");

  console.log(`\n✓ Successfully seeded ${insertedCount} users (${breakdown}) in database!\n`);
  console.table(
    USERS_DATA.map((u) => ({
      Email: u.email,
      Role: u.role,
      Name: `${u.firstName} ${u.lastName}`,
      Password: u.password,
      Active: u.isActive ?? true,
    })),
  );

  await userPool.end();
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
