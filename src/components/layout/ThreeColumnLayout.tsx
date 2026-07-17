'use client';

import { ReactNode } from 'react';

interface TwoColumnLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right?: ReactNode;
}

export function ThreeColumnLayout({ left, center }: TwoColumnLayoutProps) {
  return (
    <div className="grid grid-cols-[300px_1fr] h-full gap-0">
      {/* Left: Config Panel */}
      <div className="border-r border-[var(--color-border)] bg-white overflow-y-auto">
        {left}
      </div>

      {/* Center: Editor */}
      <div className="overflow-y-auto bg-[var(--color-bg)]">
        {center}
      </div>
    </div>
  );
}
