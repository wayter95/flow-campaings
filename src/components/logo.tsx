"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  href?: string;
  height?: number;
}

// SVG original size is 583x217 (width x height)
const LOGO_ASPECT_RATIO = 583 / 217;

export function Logo({ className, href = "/", height = 40 }: LogoProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && (resolvedTheme ?? theme) === "dark";
  const logoSrc = isDark ? "/images/logo-white.svg" : "/images/logo-dark.svg";

  const img = (
    <Image
      src={logoSrc}
      alt="Flow Campaigns"
      height={height}
      width={height * LOGO_ASPECT_RATIO}
      className={cn("h-auto object-contain", className)}
      priority
    />
  );

  if (href) {
    return (
      <Link href={href} className="flex w-full items-center justify-center">
        {img}
      </Link>
    );
  }

  return img;
}
