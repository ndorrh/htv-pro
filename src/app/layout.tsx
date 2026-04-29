import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import MiniPlayer from "@/components/player/MiniPlayer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HTV Pro",
  description: "Elite IPTV Web Application",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-zinc-50 flex h-screen overflow-hidden antialiased`}>
        <Sidebar />
        <main className="flex-1 ml-20 h-full overflow-y-auto overflow-x-hidden relative">
          {children}
        </main>
        <MiniPlayer />
      </body>
    </html>
  );
}
