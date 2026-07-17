'use client';

interface PhoneFrameProps {
  children: React.ReactNode;
}

export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="mx-auto w-[280px]">
      {/* Phone frame */}
      <div className="bg-black rounded-[3rem] p-3 shadow-xl">
        {/* Notch */}
        <div className="bg-black rounded-t-[3rem] pt-2">
          <div className="mx-auto w-20 h-6 bg-black rounded-b-2xl" />
        </div>
        {/* Screen */}
        <div className="bg-white rounded-2xl p-4 min-h-[500px] overflow-y-auto">
          {/* Status bar */}
          <div className="flex justify-between items-center text-xs text-gray-400 mb-3">
            <span>9:41</span>
            <div className="flex gap-1">
              <span>●●●●○</span>
              <span>WiFi</span>
            </div>
          </div>
          {children}
        </div>
        {/* Home indicator */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-32 h-1 bg-gray-400 rounded-full" />
        </div>
      </div>
    </div>
  );
}
