"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavCategory = { id: string; slug: string; name: string };

const activeClass = "font-medium text-[#090707] underline decoration-[#79564f] decoration-1 underline-offset-8";
const inactiveClass = "text-[#4d4545] transition-colors duration-200 hover:text-[#090707]";

export function NavLinks({
  categories,
  className,
}: {
  categories: NavCategory[];
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={className}>
      <Link href="/" className={pathname === "/" ? activeClass : inactiveClass}>
        Home
      </Link>
      {categories.map((category) => {
        const href = `/shop/${category.slug}`;
        return (
          <Link key={category.id} href={href} className={pathname === href ? activeClass : inactiveClass}>
            {category.name}
          </Link>
        );
      })}
    </nav>
  );
}
