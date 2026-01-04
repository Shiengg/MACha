import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { OnlineStatusProvider } from "@/contexts/OnlineStatusContext";
import Header from "@/components/shared/Header";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MACha",
  description: "MACha is a social media platform for creating and sharing posts with your friends and family.",
  icons: {
    icon: "/logo/MACha_logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
      >
        <AuthProvider>
          <SocketProvider>
            <OnlineStatusProvider>
              <Header />
              {children}
            </OnlineStatusProvider>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
