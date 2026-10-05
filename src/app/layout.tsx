import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Bengali } from "next/font/google";
import { I18nProvider } from "@/lib/i18n";
import { SessionProvider } from "@/lib/session-context";
import { getSessionPayload } from "@/lib/auth";
import "./globals.css";
import "./layout-guards.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoBengali = Noto_Sans_Bengali({
  variable: "--font-noto-bengali",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Bengali LKC — Bengali Local Knowledge Core",
    template: "%s · Bengali LKC",
  },
  description:
    "Role-based crowdsourcing platform for the Bengali lexicon: data entry, multi-tier validation, dispute arbitration and UKC-compatible LMF XML export.",
  applicationName: "Bengali LKC",
  appleWebApp: {
    capable: true,
    title: "Bengali LKC",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#576139" },
  ],
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const payload = await getSessionPayload();
  const initial = payload
    ? {
        session: payload.session,
        profile: payload.profile,
        permissions: payload.permissions,
        standing: payload.standing,
        mustChangePassword: payload.mustChangePassword,
      }
    : null;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoBengali.variable} font-sans antialiased`}
      >
        <I18nProvider>
          <SessionProvider initial={initial}>{children}</SessionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
