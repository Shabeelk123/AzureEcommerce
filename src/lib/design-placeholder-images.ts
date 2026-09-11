/**
 * Temporary placeholder photography from the Stitch "Atelier Hijab" design
 * mockup (AI-generated preview images, not real product photos — same
 * "swap for real photography" status as prisma/seed.ts's picsum.photos
 * placeholders). The mockup itself reuses a small handful of generated
 * photos across many cards; these helpers do the same by cycling through
 * this list by index, rather than pretending every real product already
 * has a unique photo. Drop this file once real photography is uploaded to
 * R2 via the Phase 7 admin image uploader.
 */

export const DESIGN_PRODUCT_PHOTOS = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBvS4azLfgJZ0Kueu-vXDZXBe4rDIFNTRKUz2pXWHABfEQ0RDmhyKu6wGDHEDIPuXI6kqlCk9YNUWP2H2y7bmDc1lXDui_cG0yNmeBTcKLZZ3-C0MrBkSwMMF8dxTxTV-TWViI2iVWzVMcvoQ9lKqIuOUgxqovoCJlZ_tjRzcqr5ObH6Xtz4RpbDDHJOgbR-4wZ7LBFNOKBVjeMKJq0QfkjPE_DwrKoJlUArRaBFN3uJh9YfsLqqbk",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDo3T2idlatu0NMcNtXxPaD8cpV75uvglv9psmgOJdxHySsz1LW5mcMT8V8UZ-zRaZ9E0Y9V72BU15c9kqswBPYd5coCPP8_oP9yZzEcobmTPwhBNZAdP-O3EAurkvU2iWQVWNPcyfrjaQkeW16R9mq-4QvbX9fES7_eECPI0mAiAZAZkKyfsYhh_7Er9IKYE4nyZJ3ilBbTeZs7sUmknvuhjl6H_-mB_6ez3sYeuDFe86pF0noG6U",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDrnELRHDBlnJy-7mRsdhwu1uNWgDENXIWfp450zWWSXLI0qKChAA7uQwqz8AWMDZ0aKgyFqsOBw2P70GUR5rdAoJkI_4brF8e_p60zRGFTp9zUsn924EL2lmBTZorp6ffHSebZPA0doQgr_QWwQW3o39CIBTg7IYT9b3Rdy_uFjVIqKBAVvFfoj14D18gJViMhj-3biFw8qcKowsFbnPYfUjBbfj1-mVtQVEoSdjuQrYqtgD81Y8I",
] as const;

export const DESIGN_HERO_PHOTO =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDYBlXLeLT4UKLYRp_ztTHOqj4K-uCk6Q-jUk1Ep7Tq5zdweBgq2JSs6WChFh2gcsTxTw8jDEC__OYa8v6CbmGmY0FtOGNw87rXkONIA-MfUBQzHvs5yskMk6DVm0tyrHyA8WT9_xdo5r2TrQr9Mv1QIkUp9YnLVnLVQVVNE5UsfnPPi9numqjAF6J5a1htDOfzpo8l4i63gpgWQpEI2mGTbos4dxy7nmSH8RoKE95lKHqdh3M_x-4";

export const DESIGN_STILL_LIFE_PHOTO =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDo3T2idlatu0NMcNtXxPaD8cpV75uvglv9psmgOJdxHySsz1LW5mcMT8V8UZ-zRaZ9E0Y9V72BU15c9kqswBPYd5coCPP8_oP9yZzEcobmTPwhBNZAdP-O3EAurkvU2iWQVWNPcyfrjaQkeW16R9mq-4QvbX9fES7_eECPI0mAiAZAZkKyfsYhh_7Er9IKYE4nyZJ3ilBbTeZs7sUmknvuhjl6H_-mB_6ez3sYeuDFe86pF0noG6U";

export function designProductPhoto(index: number): string {
  return DESIGN_PRODUCT_PHOTOS[index % DESIGN_PRODUCT_PHOTOS.length];
}
