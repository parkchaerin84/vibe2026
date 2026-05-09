"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "칸 추천", icon: "🔍" },
  { href: "/car-status", label: "칸 운영 관리", icon: "🚇" },
  { href: "/share-seat", label: "하차 공유", icon: "📍" },
  { href: "/community", label: "민원 커뮤니티", icon: "📢" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-blue-700">
            <span className="text-2xl">🚆</span>
            <span>SubwayEasy</span>
          </Link>
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${pathname === item.href
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                  }`}
              >
                <span>{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
