import { z } from "zod";

// --- Auth schemas ---

export const loginSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

export const signupSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis").max(50, "Le prénom est trop long"),
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Adresse email invalide"),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

// --- Shop schemas ---

export const shopUrlSchema = z.object({
  shopUrl: z.string()
    .url("L'URL de la boutique est invalide")
    .regex(/\.myshopify\.com/, "L'URL doit être une boutique Shopify (.myshopify.com)"),
});

// --- Product schemas ---

export const productUpdateSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(255).optional(),
  description: z.string().max(5000).optional(),
  price: z.number().min(0, "Le prix doit être positif").optional(),
  compareAtPrice: z.number().min(0).optional().nullable(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["active", "draft", "archived"]).optional(),
});

export const bulkUpdateSchema = z.object({
  productIds: z.array(z.string()).min(1, "Sélectionnez au moins un produit"),
  updates: productUpdateSchema,
});

// --- AI generation schemas ---

export const aiGenerateSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(["title", "description", "seo", "tags"]),
  language: z.enum(["fr", "en", "es", "de", "it"]).default("fr"),
  tone: z.enum(["professional", "casual", "luxury", "fun"]).default("professional"),
});

// --- Stripe checkout schema ---

export const checkoutSchema = z.object({
  priceId: z.string().min(1, "L'identifiant du prix est requis"),
  plan: z.enum(["starter", "pro", "scale"]),
});

// --- Contact / Support schema ---

export const contactSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  email: z.string().email("Adresse email invalide"),
  subject: z.string().min(1, "Le sujet est requis").max(200),
  message: z.string().min(10, "Le message doit contenir au moins 10 caractères").max(2000),
});

// Types
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ShopUrlInput = z.infer<typeof shopUrlSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type BulkUpdateInput = z.infer<typeof bulkUpdateSchema>;
export type AIGenerateInput = z.infer<typeof aiGenerateSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
