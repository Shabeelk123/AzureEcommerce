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
      <div className="font-jakarta flex aspect-3/4 items-center justify-center rounded-xl bg-[#f1ede8] text-sm text-[#4d4545]">
        No image available
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="group relative aspect-3/4 overflow-hidden rounded-xl bg-[#f1ede8] shadow-sm">
        <Image
          src={active.url}
          alt={active.alt || title}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show image ${index + 1}`}
              className={`relative aspect-3/4 overflow-hidden rounded-lg shadow-sm transition-all duration-200 ${
                index === activeIndex
                  ? "ring-2 ring-[#090707]"
                  : "opacity-80 hover:opacity-100"
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
