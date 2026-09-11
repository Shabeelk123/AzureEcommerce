import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";

// Scoped to (shop) routes only — see src/app/(shop)/layout.tsx, which is
// the only place these `.variable` class names get applied. Admin and
// account chrome keep the existing Geist Sans from the root layout.
export const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta-sans",
  display: "swap",
});
