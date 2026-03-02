import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from '@/components/providers';

const notoSansThai = localFont({
  src: [
    {
      path: '../public/fonts/Noto_Sans_Thai/NotoSansThai-VariableFont_wdth,wght.ttf',
      style: 'normal',
    },
  ],
  variable: '--font-noto-sans-thai',
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const kiona = localFont({
  src: '../public/fonts/Kiona-Regular.ttf',
  variable: '--font-kiona',
  display: 'swap',
  weight: '400',
});

export const metadata: Metadata = {
  title: 'XHIVE - AI Assistant',
  description: 'Your personal knowledge manager with AI',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${notoSansThai.variable} ${geistMono.variable} ${kiona.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
