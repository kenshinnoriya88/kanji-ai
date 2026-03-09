import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "幹事AI",
  description: "飲み会の幹事作業をAIで簡略化。日程調整・集合場所・お店候補・投票を1つのURLで完結。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geist.variable} antialiased bg-gray-50 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
