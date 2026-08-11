import { Router } from "express";
import { z } from "zod";
import prisma from "../prisma/client";
import { asyncHandler, ApiError } from "../utils/apiError";
import { authenticate, requireRole } from "../middleware/auth";
import { Prisma } from "@prisma/client";

const router = Router();
router.use(authenticate);

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().optional(),
  unitPrice: z.number().nonnegative(),
  minStockAlert: z.number().int().nonnegative().optional(),
  warehouseLocation: z.string().optional(),
});

// GET /products?search=&category=&lowStock=true&page=&pageSize=
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, category, lowStock, page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize) || 20));

    const where: Prisma.ProductWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
        category ? { category } : {},
      ],
    };

    let items = await prisma.product.findMany({
      where,
      skip: (pageNum - 1) * size,
      take: size,
      orderBy: { createdAt: "desc" },
    });
    const total = await prisma.product.count({ where });

    if (lowStock === "true") {
      items = items.filter((p) => p.currentStock <= p.minStockAlert);
    }

    res.json({ items, total, page: pageNum, pageSize: size, totalPages: Math.ceil(total / size) });
  })
);

// GET /products/:id
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { stockMovements: { orderBy: { createdAt: "desc" }, take: 50 } },
    });
    if (!product) throw new ApiError(404, "Product not found");
    res.json(product);
  })
);

// POST /products — add product
router.post(
  "/",
  requireRole("ADMIN", "WAREHOUSE"),
  asyncHandler(async (req, res) => {
    const data = productSchema.parse(req.body);
    const product = await prisma.product.create({ data: { ...data, currentStock: 0 } });
    res.status(201).json(product);
  })
);

// PUT /products/:id — edit product (does not directly change stock; use /stock-movements for that)
router.put(
  "/:id",
  requireRole("ADMIN", "WAREHOUSE"),
  asyncHandler(async (req, res) => {
    const data = productSchema.partial().parse(req.body);
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Product not found");

    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    res.json(product);
  })
);

// POST /products/:id/stock-movements — record a manual stock movement (IN or OUT)
const movementSchema = z.object({
  quantity: z.number().int().positive(),
  movementType: z.enum(["IN", "OUT"]),
  reason: z.string().optional(),
});

router.post(
  "/:id/stock-movements",
  requireRole("ADMIN", "WAREHOUSE"),
  asyncHandler(async (req, res) => {
    const { quantity, movementType, reason } = movementSchema.parse(req.body);

    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) throw new ApiError(404, "Product not found");

    if (movementType === "OUT" && product.currentStock - quantity < 0) {
      throw new ApiError(400, `Insufficient stock. Current stock is ${product.currentStock}, cannot remove ${quantity}.`);
    }

    const [movement, updatedProduct] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          productId: product.id,
          quantity,
          movementType,
          reason,
          createdById: req.user!.userId,
        },
      }),
      prisma.product.update({
        where: { id: product.id },
        data: {
          currentStock: movementType === "IN" ? { increment: quantity } : { decrement: quantity },
        },
      }),
    ]);

    res.status(201).json({ movement, product: updatedProduct });
  })
);

export default router;
