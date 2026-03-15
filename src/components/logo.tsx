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

export function Logo({ className, href = "/", height = 28 }: LogoProps) {
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
      width={height * (701 / 302)}
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
