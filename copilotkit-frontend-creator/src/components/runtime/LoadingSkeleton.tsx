import React from 'react';

export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => {
  const widths = [78, 65, 85, 72, 90, 60, 82, 68];
  const subWidths = [52, 45, 58, 48, 55, 42, 50, 46];
  return (
    <div className="p-4 space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 bg-surface rounded-full" style={{ width: `${widths[i % widths.length]}%` }} />
            <div className="h-2 bg-surface/60 rounded-full" style={{ width: `${subWidths[i % subWidths.length]}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};
