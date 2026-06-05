import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

// SVG favicon: orange rounded square with white "AD" text
const faviconSvg = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" rx="16" fill="#ea580c"/>
    <text x="50" y="58" font-size="38" font-weight="bold" fill="white" text-anchor="middle" font-family="system-ui, sans-serif">AD</text>
  </svg>`
)}`;

export const metadata: Metadata = {
  title: 'AskData - AI 数据问数平台',
  description: '基于 AI + SQL + 自然语言的数据可视化分析平台',
  icons: {
    icon: faviconSvg,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
