"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./ui/Icon";

const NAV_ITEMS = [
  { href: "/", label: "홈", icon: "home" },
  { href: "/ai-predict", label: "AI 예측", icon: "train" },
  { href: "/find-seat", label: "하차 검색", icon: "train" },
  { href: "/share-seat", label: "하차 공유", icon: "share" },
  { href: "/facilities", label: "편의시설", icon: "facilities" },
  { href: "/community", label: "커뮤니티", icon: "community" },
  { href: "/emergency", label: "긴급 안내", icon: "shield" },
] satisfies { href: string; label: string; icon: IconName }[];

// Hidden from navigation only. The pages remain available for future recovery.
const HIDDEN_MENU_PATHS = new Set(["/ai-predict", "/car-status"]);

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav aria-label="주요 메뉴" className="bg-white/95 backdrop-blur-md border-b border-pink-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div className="h-16 flex items-center justify-between shrink-0">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-ink rounded-lg">
            <Image src="/logo.png" alt="" width={38} height={38} />
            <span>Subway<span className="text-brand-ink">Easy</span></span>
          </Link>
          <span className="line-badge lg:hidden"><i aria-hidden="true" />서울 2호선</span>
        </div>
          <div className="grid grid-cols-6 gap-1 pb-2 lg:py-3 lg:flex lg:items-center">
            {NAV_ITEMS.filter(item => !HIDDEN_MENU_PATHS.has(item.href)).map((item) => (
              <Link
                aria-label={item.label}
                aria-current={pathname === item.href ? "page" : undefined}
                key={item.href}
                href={item.href}
                className={`flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-2 px-1 lg:px-3 py-2 rounded-xl text-[11px] sm:text-xs lg:text-sm font-semibold transition-colors min-h-12
                  ${pathname === item.href
                    ? "bg-brand-soft text-brand-ink"
                    : "text-ink-muted hover:bg-brand-soft"
                  }`}
              >
                <Icon name={item.icon} width={19} height={19} />
                <span className={pathname === item.href ? "underline underline-offset-4 decoration-[#A84770] decoration-2" : ""}>{item.label}</span>
              </Link>
            ))}
          </div>
      </div>
    </nav>
  );
}
