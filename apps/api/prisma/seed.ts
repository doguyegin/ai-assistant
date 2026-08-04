import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@aiasistan.app";
  const passwordHash = await bcrypt.hash("demo12345", 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: "Demo Kullanıcı", passwordHash },
    create: {
      email,
      name: "Demo Kullanıcı",
      passwordHash,
    },
  });

  let tenant = await prisma.tenant.findUnique({ where: { slug: "demo-oto" } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: "Demo Oto Lastik",
        slug: "demo-oto",
        phone: "0555 000 00 00",
        address: "İstanbul / Kadıköy",
        logoUrl: "https://placehold.co/128x128/png",
      },
    });
  }

  await prisma.membership.upsert({
    where: {
      tenantId_userId: { tenantId: tenant.id, userId: user.id },
    },
    update: { role: "Owner" },
    create: {
      tenantId: tenant.id,
      userId: user.id,
      role: "Owner",
    },
  });

  // Demo kullanıcının birincil üyeliği demo-oto olsun
  await prisma.membership.deleteMany({
    where: {
      userId: user.id,
      tenantId: { not: tenant.id },
    },
  });

  let customerA = await prisma.customer.findFirst({
    where: { tenantId: tenant.id, name: "Ahmet Yılmaz", deletedAt: null },
  });
  let customerB = await prisma.customer.findFirst({
    where: { tenantId: tenant.id, name: "Elif Kara", deletedAt: null },
  });

  if (!customerA) {
    customerA = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: "Ahmet Yılmaz",
        phone: "905551111111",
        email: "ahmet@example.com",
        vehiclePlate: "34 ABC 123",
        vehicleBrand: "Toyota",
        vehicleModel: "Corolla",
        vehicleYear: 2019,
        tags: ["VIP"],
        lastActivityAt: new Date(),
      },
    });
  }

  if (!customerB) {
    customerB = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: "Elif Kara",
        phone: "905552222222",
        vehiclePlate: "06 XYZ 456",
        vehicleBrand: "Renault",
        vehicleModel: "Clio",
        vehicleYear: 2021,
        tags: ["filo"],
        lastActivityAt: new Date(),
      },
    });
  }

  const reminderCount = await prisma.reminder.count({
    where: { tenantId: tenant.id },
  });
  if (reminderCount === 0) {
    await prisma.reminder.create({
      data: {
        tenantId: tenant.id,
        customerId: customerA.id,
        title: "Kışlık lastik değişimi",
        type: "tire",
        dueAt: new Date(Date.now() + 60 * 60 * 1000),
        channel: "in_app",
        notes: "Seed demo hatırlatması",
      },
    });
  }

  const quoteCount = await prisma.quote.count({
    where: { tenantId: tenant.id },
  });
  if (quoteCount === 0) {
    await prisma.quote.create({
      data: {
        tenantId: tenant.id,
        customerId: customerB.id,
        title: "4 adet yaz lastiği + montaj",
        status: "draft",
        totalAmount: 12000,
        items: {
          create: [
            {
              description: "205/55 R16 yaz lastiği",
              quantity: 4,
              unitPrice: 2500,
              lineTotal: 10000,
            },
            {
              description: "Montaj + balans",
              quantity: 1,
              unitPrice: 2000,
              lineTotal: 2000,
            },
          ],
        },
      },
    });
  }

  console.log("Seed OK");
  console.log(`  Login: ${email} / demo12345`);
  console.log(`  Tenant: ${tenant.name} (${tenant.slug})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
