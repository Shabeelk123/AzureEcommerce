"use client";

import { useState } from "react";
import Image from "next/image";

type ProductImage = { url: string; alt: string; width: number; height: number };

export function ProductGallery({
  images,
  title,
}: {
  images: ProductImage[];
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex] ?? images[0];

  if (!active) {
    return (
      <div className="bg-muted text-muted-foreground flex aspect-4/5 items-center justify-center rounded-lg text-sm">
        No image available
      </div>
    );
  }

  return (
    <div>
      <div className="bg-muted relative aspect-4/5 overflow-hidden rounded-lg">
        <Image
          src={active.url}
          alt={active.alt || title}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show image ${index + 1}`}
              className={`relative aspect-4/5 overflow-hidden rounded-md border-2 ${
                index === activeIndex ? "border-primary" : "border-transparent"
              }`}
            >
              <Image src={image.url} alt="" fill sizes="10vw" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
