import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('ingatmati', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'ipangpangeran' },
    update: { password: hashedPassword },
    create: {
      username: 'ipangpangeran',
      password: hashedPassword,
    },
  });
  console.log(`Admin user created/updated: ${admin.username}`);

  // Create default settings
  await prisma.setting.upsert({
    where: { key: 'reseller_fee_percentage' },
    update: { value: '7.0' },
    create: { key: 'reseller_fee_percentage', value: '7.0' },
  });

  // Define products list and pricing across lapaks
  // lapakId: 1 = Lapak Ipang, 2 = Kang Asep PJP, 3 = Kang Asep RDTX & GRHA
  const productsData = [
    {
      name: 'Mix isi 50',
      prices: [
        { lapakId: 1, price: 105000, target: 0, het: 0 },
        { lapakId: 2, price: 0, target: 107000, het: 115000 },
        { lapakId: 3, price: 0, target: 107000, het: 130000 },
      ],
    },
    {
      name: 'Mix isi 20',
      prices: [
        { lapakId: 1, price: 55000, target: 0, het: 0 },
        { lapakId: 2, price: 0, target: 57000, het: 62000 },
        { lapakId: 3, price: 0, target: 57000, het: 65000 },
      ],
    },
    {
      name: 'Mix isi 10',
      prices: [
        { lapakId: 1, price: 28000, target: 0, het: 0 },
        { lapakId: 2, price: 0, target: 30000, het: 33000 },
        { lapakId: 3, price: 0, target: 30000, het: 35000 },
      ],
    },
    {
      name: 'Lenjer Jumbo isi 2',
      prices: [
        { lapakId: 1, price: 28000, target: 0, het: 0 },
        { lapakId: 2, price: 0, target: 30000, het: 33000 },
        { lapakId: 3, price: 0, target: 30000, het: 35000 },
      ],
    },
    {
      name: 'Lenjer isi 10',
      prices: [
        { lapakId: 1, price: 28000, target: 0, het: 0 },
        { lapakId: 2, price: 0, target: 30000, het: 33000 },
        { lapakId: 3, price: 0, target: 30000, het: 35000 },
      ],
    },
    {
      name: 'Selam isi 10',
      prices: [
        { lapakId: 1, price: 28000, target: 0, het: 0 },
        { lapakId: 2, price: 0, target: 30000, het: 33000 },
        { lapakId: 3, price: 0, target: 30000, het: 35000 },
      ],
    },
    {
      name: 'Kulit isi 10',
      prices: [
        { lapakId: 1, price: 28000, target: 0, het: 0 },
        { lapakId: 2, price: 0, target: 30000, het: 33000 },
        { lapakId: 3, price: 0, target: 30000, het: 35000 },
      ],
    },
    {
      name: 'Adaan isi 10',
      prices: [
        { lapakId: 1, price: 28000, target: 0, het: 0 },
        { lapakId: 2, price: 0, target: 30000, het: 33000 },
        { lapakId: 3, price: 0, target: 30000, het: 35000 },
      ],
    },
    {
      name: 'Selam Jumbo',
      prices: [
        { lapakId: 1, price: 23000, target: 0, het: 0 },
        { lapakId: 2, price: 0, target: 25000, het: 28000 },
        { lapakId: 3, price: 0, target: 25000, het: 35000 },
      ],
    },
    {
      name: 'Pempek Keju isi 5',
      prices: [
        { lapakId: 1, price: 30000, target: 0, het: 0 },
        { lapakId: 2, price: 0, target: 32000, het: 35000 },
        { lapakId: 3, price: 0, target: 32000, het: 40000 },
      ],
    },
    {
      name: 'Pempek Keju isi 10',
      prices: [
        { lapakId: 1, price: 50000, target: 0, het: 0 },
        { lapakId: 2, price: 0, target: 52000, het: 56000 },
        { lapakId: 3, price: 0, target: 52000, het: 65000 },
      ],
    },
    {
      name: 'Tekwan ½ kg',
      prices: [
        { lapakId: 1, price: 73000, target: 0, het: 0 },
        { lapakId: 2, price: 0, target: 75000, het: 81000 },
        { lapakId: 3, price: 0, target: 75000, het: 85000 },
      ],
    },
    {
      name: 'Tekwan 1 kg',
      prices: [
        { lapakId: 1, price: 124000, target: 0, het: 0 },
        { lapakId: 2, price: 0, target: 125000, het: 135000 },
        { lapakId: 3, price: 0, target: 125000, het: 155000 },
      ],
    },
    {
      name: 'Tekwan ½ kg (Komplit)',
      prices: [
        { lapakId: 1, price: 73000, target: 0, het: 0 },
        { lapakId: 2, price: 0, target: 75000, het: 81000 },
        { lapakId: 3, price: 0, target: 75000, het: 85000 },
      ],
    },
    {
      name: 'Tekwan 1 kg (Komplit)',
      prices: [
        { lapakId: 1, price: 124000, target: 0, het: 0 },
        { lapakId: 2, price: 0, target: 125000, het: 135000 },
        { lapakId: 3, price: 0, target: 125000, het: 155000 },
      ],
    },
  ];

  for (const item of productsData) {
    const product = await prisma.product.upsert({
      where: { name: item.name },
      update: {},
      create: { name: item.name, isActive: true },
    });

    for (const priceItem of item.prices) {
      await prisma.lapakPrice.upsert({
        where: {
          productId_lapakId: {
            productId: product.id,
            lapakId: priceItem.lapakId,
          },
        },
        update: {
          price: priceItem.price,
          target: priceItem.target,
          het: priceItem.het,
        },
        create: {
          productId: product.id,
          lapakId: priceItem.lapakId,
          price: priceItem.price,
          target: priceItem.target,
          het: priceItem.het,
        },
      });
    }
  }

  console.log('Database seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
