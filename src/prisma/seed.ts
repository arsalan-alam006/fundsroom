import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "./client";

async function main() {
  console.log("Seeding database...");

  const password = "Password123!";
  const passwordHash = await bcrypt.hash(password, 10);

  const roles: { name: string; email: string; role: "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS" }[] = [
    { name: "Admin User", email: "admin@erpcrm.test", role: "ADMIN" },
    { name: "Sales User", email: "sales@erpcrm.test", role: "SALES" },
    { name: "Warehouse User", email: "warehouse@erpcrm.test", role: "WAREHOUSE" },
    { name: "Accounts User", email: "accounts@erpcrm.test", role: "ACCOUNTS" },
  ];

  for (const r of roles) {
    await prisma.user.upsert({
      where: { email: r.email },
      update: {},
      create: { name: r.name, email: r.email, passwordHash, role: r.role },
    });
  }

  const customer = await prisma.customer.upsert({
    where: { id: "seed-customer-1" },
    update: {},
    create: {
      id: "seed-customer-1",
      name: "Ramesh Traders",
      mobile: "9876543210",
      email: "ramesh@traders.test",
      businessName: "Ramesh Traders Pvt Ltd",
      customerType: "WHOLESALE",
      status: "ACTIVE",
      address: "MG Road, Vadodara",
      notes: "Regular bulk buyer",
    },
  });

  const product1 = await prisma.product.upsert({
    where: { sku: "SKU-001" },
    update: {},
    create: {
      name: "Steel Bolt 8mm",
      sku: "SKU-001",
      category: "Hardware",
      unitPrice: 5.5,
      currentStock: 500,
      minStockAlert: 50,
      warehouseLocation: "A1-Rack3",
    },
  });

  await prisma.product.upsert({
    where: { sku: "SKU-002" },
    update: {},
    create: {
      name: "Copper Wire 1mm (Roll)",
      sku: "SKU-002",
      category: "Electrical",
      unitPrice: 320,
      currentStock: 40,
      minStockAlert: 10,
      warehouseLocation: "B2-Rack1",
    },
  });

  console.log("Seed complete.");
  console.log("Test login credentials (same password for all):", password);
  roles.forEach((r) => console.log(`  ${r.role.padEnd(10)} -> ${r.email}`));
  console.log("Sample customer:", customer.name);
  console.log("Sample product:", product1.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
