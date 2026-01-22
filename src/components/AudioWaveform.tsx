
import React from "react";

interface AudioWaveformProps {
  isActive: boolean;
  audioLevel?: number;
}

export function AudioWaveform({ isActive, audioLevel = 0.5 }: AudioWaveformProps) {
  // Normalize audio level to be between 0.1 and 1
  const normalizedLevel = isActive ? Math.max(0.1, Math.min(1, audioLevel)) : 0;
  
  // Generate different bar heights based on audio level
  const bars = Array.from({ length: 3 }, (_, i) => {
    const height = isActive ? 10 + Math.floor(normalizedLevel * 10) * (i === 1 ? 1.5 : 1) : 5;
    return height;
  });

  return (
    <div className="flex items-center justify-center gap-[2px] h-full">
      {bars.map((height, index) => (
        <div
          key={index}
          className="bg-current rounded-full w-[2px] transition-all duration-100"
          style={{
            height: `${height}px`,
            animation: isActive ? `audio-pulse-${index % 3} 0.8s infinite` : 'none',
          }}
        />
      ))}
    </div>
  );
}
