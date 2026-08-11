import { Router } from "express";
import { z } from "zod";
import prisma from "../prisma/client";
import { asyncHandler, ApiError } from "../utils/apiError";
import { authenticate, requireRole } from "../middleware/auth";
import { Prisma } from "@prisma/client";

const router = Router();
router.use(authenticate);

const customerSchema = z.object({
  name: z.string().min(1),
  mobile: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")).optional(),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  customerType: z.enum(["RETAIL", "WHOLESALE", "DISTRIBUTOR"]).optional(),
  address: z.string().optional(),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).optional(),
  followUpDate: z.string().datetime().optional().or(z.literal("")).optional(),
  notes: z.string().optional(),
});

// GET /customers?search=&status=&type=&page=&pageSize=
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, status, type, page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize) || 20));

    const where: Prisma.CustomerWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { mobile: { contains: search } },
                { businessName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
        status ? { status: status as Prisma.EnumCustomerStatusFilter["equals"] } : {},
        type ? { customerType: type as Prisma.EnumCustomerTypeFilter["equals"] } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: (pageNum - 1) * size,
        take: size,
        orderBy: { createdAt: "desc" },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({ items, total, page: pageNum, pageSize: size, totalPages: Math.ceil(total / size) });
  })
);

// GET /customers/:id — full detail including follow-up notes
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { followUps: { orderBy: { createdAt: "desc" } } },
    });
    if (!customer) throw new ApiError(404, "Customer not found");
    res.json(customer);
  })
);

// POST /customers — add customer
router.post(
  "/",
  requireRole("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const data = customerSchema.parse(req.body);
    const customer = await prisma.customer.create({
      data: {
        ...data,
        email: data.email || null,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      },
    });
    res.status(201).json(customer);
  })
);

// PUT /customers/:id — edit customer
router.put(
  "/:id",
  requireRole("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const data = customerSchema.partial().parse(req.body);
    const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Customer not found");

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        ...data,
        email: data.email !== undefined ? data.email || null : undefined,
        followUpDate: data.followUpDate !== undefined ? (data.followUpDate ? new Date(data.followUpDate) : null) : undefined,
      },
    });
    res.json(customer);
  })
);

// POST /customers/:id/follow-ups — add a follow-up note
const followUpSchema = z.object({ note: z.string().min(1) });
router.post(
  "/:id/follow-ups",
  requireRole("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const { note } = followUpSchema.parse(req.body);
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const followUp = await prisma.followUpNote.create({
      data: { customerId: customer.id, note, createdById: req.user!.userId },
    });
    res.status(201).json(followUp);
  })
);

export default router;
