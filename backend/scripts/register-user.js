import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const prisma = new PrismaClient();

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('\nPenggunaan: node scripts/register-user.js <username> <password>\n');
  process.exit(1);
}

const [username, password] = args;

async function register() {
  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      console.error(`\nError: Username "${username}" sudah terdaftar di database.\n`);
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert new user
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
      },
    });

    console.log(`\nSukses: User baru "${newUser.username}" berhasil didaftarkan!\n`);
  } catch (error) {
    console.error('\nTerjadi kesalahan saat mendaftarkan user:', error, '\n');
  } finally {
    await prisma.$disconnect();
  }
}

register();
