import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Push 运营工具',
  description: '百度网盘学习 Agent Push 文案生成与运营配置导出',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[var(--color-bg)]">
        {children}
      </body>
    </html>
  );
}
