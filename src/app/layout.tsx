import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Prospectus | MSOT Academic Course Progression",
  description:
    "Quiet Precision academic analytics platform tracking semesters, teaching sessions, topic completion and exam readiness across MSOT campuses.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F7F8FC] text-[#172033] font-sans">
        {children}
      </body>
    </html>
  );
}
