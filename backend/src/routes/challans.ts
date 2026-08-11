import { Router } from "express";
import { z } from "zod";
import prisma from "../prisma/client";
import { asyncHandler, ApiError } from "../utils/apiError";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();
router.use(authenticate);

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const createChallanSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(itemSchema).min(1, "At least one product is required"),
  status: z.enum(["DRAFT", "CONFIRMED"]).optional().default("DRAFT"),
});

// Generates a challan number like CH-2026-000123 (year + zero-padded sequence)
async function generateChallanNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.challan.count();
  const sequence = String(count + 1).padStart(6, "0");
  return `CH-${year}-${sequence}`;
}

// GET /challans?status=&customerId=&page=&pageSize=
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, customerId, page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize) || 20));

    const where = {
      ...(status ? { status: status as "DRAFT" | "CONFIRMED" | "CANCELLED" } : {}),
      ...(customerId ? { customerId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.challan.findMany({
        where,
        include: { customer: true, items: true },
        skip: (pageNum - 1) * size,
        take: size,
        orderBy: { createdAt: "desc" },
      }),
      prisma.challan.count({ where }),
    ]);

    res.json({ items, total, page: pageNum, pageSize: size, totalPages: Math.ceil(total / size) });
  })
);

// GET /challans/:id
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const challan = await prisma.challan.findUnique({
      where: { id: req.params.id },
      include: { customer: true, items: { include: { product: true } }, createdBy: true },
    });
    if (!challan) throw new ApiError(404, "Challan not found");
    res.json(challan);
  })
);

// POST /challans — create a challan (Draft or Confirmed).
// Business rules:
//  - Challan number is auto-generated.
//  - Product data (name, sku, price) is snapshotted onto each line item.
//  - If status is CONFIRMED, stock is reduced immediately and must not go negative.
//  - If status is DRAFT, no stock is touched yet (stock is only reduced on confirm).
router.post(
  "/",
  requireRole("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const { customerId, items, status } = createChallanSchema.parse(req.body);

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    if (products.length !== productIds.length) {
      throw new ApiError(404, "One or more products were not found");
    }
    const productMap = new Map(products.map((p) => [p.id, p]));

    // If confirming immediately, validate stock availability up front.
    if (status === "CONFIRMED") {
      for (const item of items) {
        const product = productMap.get(item.productId)!;
        if (product.currentStock - item.quantity < 0) {
          throw new ApiError(
            400,
            `Insufficient stock for "${product.name}" (SKU ${product.sku}). Available: ${product.currentStock}, requested: ${item.quantity}.`
          );
        }
      }
    }

    const challanNumber = await generateChallanNumber();
    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

    const challan = await prisma.$transaction(async (tx) => {
      const created = await tx.challan.create({
        data: {
          challanNumber,
          customerId,
          status,
          totalQuantity,
          createdById: req.user!.userId,
          items: {
            create: items.map((item) => {
              const product = productMap.get(item.productId)!;
              return {
                productId: product.id,
                productNameSnapshot: product.name,
                skuSnapshot: product.sku,
                unitPriceSnapshot: product.unitPrice,
                quantity: item.quantity,
              };
            }),
          },
        },
        include: { items: true, customer: true },
      });

      if (status === "CONFIRMED") {
        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              movementType: "OUT",
              reason: `Sales challan ${challanNumber}`,
              createdById: req.user!.userId,
            },
          });
        }
      }

      return created;
    });

    res.status(201).json(challan);
  })
);

// PATCH /challans/:id/confirm — confirm a draft challan, reducing stock now.
router.patch(
  "/:id/confirm",
  requireRole("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const challan = await prisma.challan.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!challan) throw new ApiError(404, "Challan not found");
    if (challan.status !== "DRAFT") {
      throw new ApiError(400, `Only DRAFT challans can be confirmed. This challan is ${challan.status}.`);
    }

    const productIds = challan.items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of challan.items) {
      const product = productMap.get(item.productId);
      if (!product) throw new ApiError(404, `Product ${item.productNameSnapshot} no longer exists`);
      if (product.currentStock - item.quantity < 0) {
        throw new ApiError(
          400,
          `Insufficient stock for "${product.name}" (SKU ${product.sku}). Available: ${product.currentStock}, requested: ${item.quantity}.`
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const item of challan.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            movementType: "OUT",
            reason: `Sales challan ${challan.challanNumber}`,
            createdById: req.user!.userId,
          },
        });
      }
      return tx.challan.update({
        where: { id: challan.id },
        data: { status: "CONFIRMED" },
        include: { items: true, customer: true },
      });
    });

    res.json(updated);
  })
);

// PATCH /challans/:id/cancel — cancel a challan. If it was CONFIRMED, stock is restored.
router.patch(
  "/:id/cancel",
  requireRole("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const challan = await prisma.challan.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!challan) throw new ApiError(404, "Challan not found");
    if (challan.status === "CANCELLED") {
      throw new ApiError(400, "Challan is already cancelled");
    }

    const wasConfirmed = challan.status === "CONFIRMED";

    const updated = await prisma.$transaction(async (tx) => {
      if (wasConfirmed) {
        for (const item of challan.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              movementType: "IN",
              reason: `Reversal of cancelled challan ${challan.challanNumber}`,
              createdById: req.user!.userId,
            },
          });
        }
      }
      return tx.challan.update({ where: { id: challan.id }, data: { status: "CANCELLED" } });
    });

    res.json(updated);
  })
);

export default router;
