import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "SubwayEasy - 스마트 지하철 이용 도우미",
  description: "서울 2호선 하차 정보 공유, 실제 화장실 위치 안내와 이용자 커뮤니티",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="site-shell min-h-full flex flex-col">
        <a href="#main-content" className="skip-link">본문으로 바로 가기</a>
        <Navbar />
        <main id="main-content" tabIndex={-1} className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 outline-none">
          {children}
        </main>
        <footer className="border-t border-pink-100 bg-white/70 mt-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7 flex flex-col sm:flex-row gap-2 justify-between text-xs text-ink-muted"><span className="font-bold text-sm text-ink">SubwayEasy<span className="font-normal ml-3 text-xs text-ink-muted">함께 나누는 더 편한 이동</span></span><span>© 2026 SubwayEasy · 서울 2호선</span></div>
        </footer>
      </body>
    </html>
  );
}
