import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitHub Contribution Finder",
  description: "Find open source projects and issues to contribute to using AI-powered natural language search",
  keywords: ["github", "open source", "contribution", "issues", "good first issue", "help wanted"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
