import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Пепельный рубеж",
  description: "Браузерная двухмерная ролевая игра с боями против врагов мира.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
