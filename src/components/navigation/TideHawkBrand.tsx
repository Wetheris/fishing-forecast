"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function TideHawkBrand() {
  const pathname = usePathname();

  if (pathname !== "/") {
    return null;
  }

  return (
    <Link
      href="/"
      aria-label="TideHawk home"
      className="absolute left-16 top-3 z-[900] inline-flex rounded-xl bg-white/75 px-2 py-1 shadow-sm backdrop-blur-sm transition hover:bg-white"
    >
      <Image
        src="/tidehawk-logo.png"
        alt="TideHawk"
        width={1100}
        height={308}
        priority
        className="h-auto w-[145px] sm:w-[175px]"
      />
    </Link>
  );
}
