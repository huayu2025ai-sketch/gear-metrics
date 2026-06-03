import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LayerLint",
  description: "户外装备资产管理与智能分析平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#191919] text-[#e6e7ea]">
        <NextTopLoader
          color="#2dd4bf"
          height={2}
          showSpinner={false}
          shadow="0 0 10px #2dd4bf,0 0 5px #2dd4bf"
        />
        {children}
      </body>
    </html>
  );
}
