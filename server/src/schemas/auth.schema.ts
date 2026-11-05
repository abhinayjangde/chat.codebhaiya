import { z } from "zod";

export const emailSchema = z.string().trim().email("Invalid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be 128 characters or fewer");

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name must be 50 characters or fewer");

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    name: nameSchema,
  })
  .passthrough();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().trim().min(1, "Password is required"),
  })
  .passthrough();

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().trim().min(1, "Current password is required"),
    newPassword: passwordSchema,
  })
  .passthrough();

export const preferencesSchema = z
  .object({
    systemInstructions: z
      .string()
      .trim()
      .max(4_000, "Custom instructions must be 4,000 characters or fewer"),
  })
  .passthrough();

export const deleteAccountSchema = z
  .object({
    confirmation: z
      .string()
      .trim()
      .refine(
        (val) => val.toLowerCase() === "confirm",
        'Please type "confirm" to confirm account deletion'
      ),
  })
  .passthrough();

export const recoverAccountSchema = z
  .object({
    email: emailSchema,
    password: z.string().trim().min(1, "Password is required"),
  })
  .passthrough();

export const requestPasswordResetSchema = z
  .object({ email: emailSchema })
  .passthrough();

export const resetPasswordSchema = z
  .object({
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, "Invalid or expired reset link"),
    password: passwordSchema,
  })
  .passthrough();

