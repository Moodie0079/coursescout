import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { GoogleAnalytics } from '@next/third-parties/google';
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CourseScout - Carleton University Course & Professor Insights",
  description: "Get real information about your schools courses and professors from real students experiences.",
  keywords: "Carleton University, course reviews, professor reviews, student insights, university courses",
  authors: [{ name: "CourseScout" }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
      {process.env.NEXT_PUBLIC_GA_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      )}
    </html>
  );
}
