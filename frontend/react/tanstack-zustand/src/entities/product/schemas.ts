import { z } from 'zod';

// Вложенные схемы для вложенных объектов
const dimensionSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
  depth: z.number().optional(),
}).optional();

const reviewSchema = z.object({
  rating: z.number().optional(),
  comment: z.string().optional(),
  date: z.string().optional(),
  reviewerName: z.string().optional(),
  reviewerEmail: z.string().optional(),
});

const metaSchema = z.object({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  barcode: z.string().optional(),
  qrCode: z.string().optional(),
}).optional();

export const productSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number(),
  discountPercentage: z.number().optional(),
  rating: z.number().optional(),
  stock: z.number().optional(),
  tags: z.array(z.string()).optional(),
  brand: z.string().optional().catch("Unknown"), 
  sku: z.string().optional(),
  weight: z.number().optional(),
  dimensions: dimensionSchema,
  warrantyInformation: z.string().optional(),
  shippingInformation: z.string().optional(),
  availabilityStatus: z.string().optional(),
  reviews: z.array(reviewSchema).optional(),
  returnPolicy: z.string().optional(),
  minimumOrderQuantity: z.number().optional(),
  meta: metaSchema,
  images: z.array(z.string()).optional(),
  thumbnail: z.string().url().optional().catch("https://placehold.co/150x150?text=No+Image"),
});

export const productsResponseSchema = z.object({
  products: z.array(productSchema),
  total: z.number(),
  skip: z.number(),
  limit: z.number(),
});

// Типы выводятся автоматически и теперь безопасны
export type Product = z.infer<typeof productSchema>;
export type ProductsResponse = z.infer<typeof productsResponseSchema>;