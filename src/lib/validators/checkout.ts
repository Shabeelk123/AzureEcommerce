import { z } from "zod";
import { emailSchema, indianPhoneSchema, pincodeSchema } from "@/lib/validators/auth";

export const placeOrderSchema = z.object({
  email: emailSchema,
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  phone: indianPhoneSchema,
  line1: z.string().trim().min(3, "Address is required").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(2, "City is required").max(100),
  state: z.string().trim().min(2, "State is required").max(100),
  pincode: pincodeSchema,
  couponCode: z.string().trim().max(40).optional().or(z.literal("")),
  paymentMethod: z.enum(["RAZORPAY", "COD"]),
});
export type PlaceOrderFormInput = z.infer<typeof placeOrderSchema>;

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});
