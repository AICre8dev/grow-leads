import React, { useEffect, useState } from 'react';

interface ProgressBarProps {
  value: number;
  className?: string;
  height?: string;
}

export default function ProgressBar({ value, className = '', height = 'h-1.5' }: ProgressBarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`w-full bg-grow-border rounded-full overflow-hidden ${height} ${className}`}>
      <div
        className="progress-bar-fill h-full bg-grow-accent rounded-full"
        style={{
          width: mounted ? `${value}%` : '0%',
          transition: 'width 1s ease-out',
        }}
      />
    </div>
  );
}
