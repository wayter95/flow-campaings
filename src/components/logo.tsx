"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  className?: string;
  href?: string;
  height?: number;
}

// SVG original size is 583x217 (width x height)
const LOGO_ASPECT_RATIO = 583 / 217;

export function Logo({ className, href = "/", height = 40 }: LogoProps) {
  const computedWidth = Math.round(height * LOGO_ASPECT_RATIO);

  // Render both logos and use CSS dark: class to toggle visibility.
  // This avoids hydration mismatch and flash of wrong logo.
  const img = (
    <>
      <Image
        src="/images/logo-dark.svg"
        alt="Flow Campaigns"
        height={height}
        width={computedWidth}
        className={cn("h-auto object-contain dark:hidden", className)}
        priority
        unoptimized
      />
      <Image
        src="/images/logo-white.svg"
        alt="Flow Campaigns"
        height={height}
        width={computedWidth}
        className={cn("h-auto object-contain hidden dark:block", className)}
        priority
        unoptimized
      />
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex w-full items-center justify-center"
        style={{ minHeight: height }}
      >
        {img}
      </Link>
    );
  }

  return img;
}
