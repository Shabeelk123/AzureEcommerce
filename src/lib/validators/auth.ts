import { z } from "zod";

// Deliberately not overly strict (no forced special-character rule) — length
// plus a letter and a number stops the weakest passwords without pushing
// people into "P@ssw0rd!"-style patterns that don't actually add entropy.
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters") // argon2/bcrypt-safe upper bound
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const emailSchema = z.email("Enter a valid email address").trim().toLowerCase();

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: emailSchema,
  password: passwordSchema,
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const indianPhoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");

export const pincodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter a valid 6-digit pincode");

export const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  phone: indianPhoneSchema,
  line1: z.string().trim().min(3, "Address is required").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(2, "City is required").max(100),
  state: z.string().trim().min(2, "State is required").max(100),
  pincode: pincodeSchema,
  isDefault: z.boolean().optional(),
});
export type AddressInput = z.infer<typeof addressSchema>;
