import type { Metadata, Viewport } from "next";
import { Manrope, Noto_Sans_Sinhala } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { BottomTabBar } from "@/components/layout/BottomTabBar";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const notoSinhala = Noto_Sans_Sinhala({
  variable: "--font-noto-sinhala",
  subsets: ["sinhala"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "අවුරුදු උළෙල 2026 | Awurudu Festival",
  description: "Sinhala Awurudu Uthsawaya Game Management App",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#7C3AED",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${manrope.variable} ${notoSinhala.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-100 text-foreground">
        <NextIntlClientProvider messages={messages}>
          <div className="max-w-lg mx-auto w-full bg-white min-h-screen shadow-sm">
            {children}
          </div>
          <BottomTabBar />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
