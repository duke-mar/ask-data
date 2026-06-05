'use client';

import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportButtonProps {
  question: string;
  sql?: string;
  chartOption?: Record<string, unknown>;
  analysis?: string;
}

export function ExportButton({ question, sql, chartOption, analysis }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/export/markdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, sql, chartOption, analysis }),
      });
      const data = await res.json();
      if (data.success) {
        const blob = new Blob([data.markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `分析报告-${new Date().toISOString().slice(0, 10)}.md`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-xs h-8 border-stone-300 hover:bg-stone-50"
      onClick={handleExport}
      disabled={exporting}
    >
      <Download className="h-3.5 w-3.5 mr-1.5" />
      {exporting ? '导出中...' : '导出 Markdown'}
    </Button>
  );
}
