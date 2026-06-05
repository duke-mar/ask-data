'use client';

import { Clock, CheckCircle, XCircle, Loader2, Ban } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TimelineStep } from '@/app/types';
import { formatDate } from '@/app/lib/utils';

interface TimelineSidebarProps {
  steps: TimelineStep[];
}

function StatusIcon({ status }: { status: TimelineStep['status'] }) {
  switch (status) {
    case 'running':
      return <Loader2 className="h-3.5 w-3.5 text-orange-500 animate-spin" />;
    case 'success':
      return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
    case 'error':
      return <XCircle className="h-3.5 w-3.5 text-rose-500" />;
    case 'cancelled':
      return <Ban className="h-3.5 w-3.5 text-stone-400" />;
    default:
      return <Clock className="h-3.5 w-3.5 text-stone-300" />;
  }
}

export function TimelineSidebar({ steps }: TimelineSidebarProps) {
  return (
    <div className="w-60 border-l border-stone-200 bg-white flex flex-col h-full shrink-0">
      <div className="px-3 py-2.5 border-b border-stone-200">
        <h3 className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          处理时间轴
        </h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2.5 space-y-2">
          {steps.length === 0 && (
            <div className="text-xs text-stone-400 text-center py-6">当前无处理任务</div>
          )}
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              <div className="flex items-start gap-2">
                <div className="flex flex-col items-center pt-0.5">
                  <StatusIcon status={step.status} />
                  {index < steps.length - 1 && (
                    <div className="w-px h-full min-h-[16px] bg-stone-200 my-0.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-stone-700">{step.title}</span>
                  </div>
                  {step.detail && (
                    <p className="text-[10px] text-stone-500 mt-0.5 break-words">{step.detail}</p>
                  )}
                  {step.timestamp && (
                    <p className="text-[10px] text-stone-400 mt-0.5">{formatDate(step.timestamp)}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
