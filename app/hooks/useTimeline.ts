'use client';

import { useState, useCallback } from 'react';
import { TimelineStep } from '@/app/types';
import { generateId } from '@/app/lib/utils';

export function useTimeline() {
  const [steps, setSteps] = useState<TimelineStep[]>([]);

  const addStep = useCallback((title: string, detail?: string) => {
    const step: TimelineStep = {
      id: generateId(),
      title,
      status: 'running',
      detail,
      timestamp: Date.now(),
    };
    setSteps((prev) => [...prev, step]);
    return step.id;
  }, []);

  const updateStep = useCallback((id: string, updates: Partial<TimelineStep>) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, ...updates, timestamp: Date.now() } : s
      )
    );
  }, []);

  const completeStep = useCallback((id: string, detail?: string) => {
    updateStep(id, { status: 'success', detail });
  }, [updateStep]);

  const failStep = useCallback((id: string, detail?: string) => {
    updateStep(id, { status: 'error', detail });
  }, [updateStep]);

  const cancelStep = useCallback((id: string, detail?: string) => {
    updateStep(id, { status: 'cancelled', detail });
  }, [updateStep]);

  /**
   * 批量将所有 running 步骤标记为失败（异常兜底）
   */
  const failAllRunning = useCallback((detail?: string) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.status === 'running'
          ? { ...s, status: 'error', detail: detail || s.detail, timestamp: Date.now() }
          : s
      )
    );
  }, []);

  /**
   * 批量将所有 running 步骤标记为取消（用户取消兜底）
   */
  const cancelAllRunning = useCallback((detail?: string) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.status === 'running'
          ? { ...s, status: 'cancelled', detail: detail || s.detail, timestamp: Date.now() }
          : s
      )
    );
  }, []);

  const clearSteps = useCallback(() => {
    setSteps([]);
  }, []);

  const replaceSteps = useCallback((newSteps: TimelineStep[]) => {
    setSteps(newSteps);
  }, []);

  return {
    steps,
    setSteps: replaceSteps,
    addStep,
    updateStep,
    completeStep,
    failStep,
    cancelStep,
    failAllRunning,
    cancelAllRunning,
    clearSteps,
  };
}
