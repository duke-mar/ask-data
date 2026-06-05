'use client';

import { Loader2 } from 'lucide-react';

interface ProcessingTimerProps {
  step: string;
  elapsed: number;
}

export function ProcessingTimer({ step, elapsed }: ProcessingTimerProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-stone-500 animate-pulse">
      <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
      <span>{step}</span>
      <span className="text-orange-600 font-mono">已耗时 {elapsed} 秒</span>
    </div>
  );
}
