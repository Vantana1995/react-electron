import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Twitter Automation Platform API",
  description: "Backend API server for Twitter automation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
