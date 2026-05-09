import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "SubwayEasy - 스마트 지하철 이용 도우미",
  description: "서울 지하철 혼잡도 해결, 칸 추천, 하차 공유, 민원 커뮤니티",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
          {children}
        </main>
        <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-400">
          © 2026 SubwayEasy — 서울 지하철 혼잡도 해결 플랫폼
        </footer>
      </body>
    </html>
  );
}
