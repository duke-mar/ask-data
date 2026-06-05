'use client';

import { useState, useEffect } from 'react';
import { Table, Check, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DbConfig, TableSchema } from '@/app/types';

interface TableSelectorProps {
  db: DbConfig | null;
  tables: string[];
  selectedTables: string[];
  schemas: TableSchema[];
  tableNotes: Record<string, string>;
  loading: boolean;
  onSelectTables: (tables: string[]) => void;
  onLoadTables: (db: DbConfig) => void;
  onLoadSchemas: (db: DbConfig, tables: string[]) => void;
  onUpdateNote: (tableName: string, note: string) => void;
}

export function TableSelector({
  db,
  tables,
  selectedTables,
  schemas,
  tableNotes,
  loading,
  onSelectTables,
  onLoadTables,
  onLoadSchemas,
  onUpdateNote,
}: TableSelectorProps) {
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');

  useEffect(() => {
    if (db && tables.length === 0) {
      onLoadTables(db);
    }
  }, [db]);

  useEffect(() => {
    if (db && selectedTables.length > 0) {
      onLoadSchemas(db, selectedTables);
    }
  }, [selectedTables, db]);

  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  const toggleTable = (tableName: string) => {
    if (selectedTables.includes(tableName)) {
      const next = selectedTables.filter((t) => t !== tableName);
      onSelectTables(next);
      setLimitWarning(null);
    } else {
      if (selectedTables.length >= 10) {
        setLimitWarning('最多只能选择 10 个数据表');
        setTimeout(() => setLimitWarning(null), 3000);
        return;
      }
      const next = [...selectedTables, tableName];
      onSelectTables(next);
      setLimitWarning(null);
    }
  };

  if (!db) {
    return (
      <div className="text-xs text-stone-400 text-center py-6 bg-stone-50 rounded-md">
        请先选择数据库
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-1.5">
          <Table className="h-4 w-4" />
          选择数据表
        </h3>
        {selectedTables.length > 0 && (
          <Badge variant="secondary" className="text-[10px] h-5">
            已选 {selectedTables.length} 个
          </Badge>
        )}
      </div>

      {limitWarning && (
        <div className="text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded-md"
        >{limitWarning}</div>
      )}

      {loading && tables.length === 0 ? (
        <div className="text-xs text-stone-400 text-center py-4">加载中...</div>
      ) : (
        <ScrollArea className="h-64 rounded-md border border-stone-200 bg-white">
          <div className="p-2 space-y-1">
            {tables.map((tableName) => (
              <div key={tableName}>
                <button
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-sm text-sm transition-colors ${
                    selectedTables.includes(tableName)
                      ? 'bg-orange-50 text-orange-700'
                      : 'hover:bg-stone-50 text-stone-700'
                  }`}
                  onClick={() => toggleTable(tableName)}
                >
                  <Check
                    className={`h-3.5 w-3.5 shrink-0 ${
                      selectedTables.includes(tableName) ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <span className="flex-1 text-left truncate">{tableName}</span>
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {selectedTables.length > 0 && schemas.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-stone-500">表结构备注</h4>
          <Accordion type="multiple" className="w-full">
            {schemas.map((schema) => (
              <AccordionItem key={schema.name} value={schema.name} className="border-stone-200">
                <AccordionTrigger className="text-xs py-2 hover:no-underline">
                  <span className="flex items-center gap-1.5">
                    <Table className="h-3 w-3" />
                    {schema.name}
                    {tableNotes[schema.name] && (
                      <StickyNote className="h-3 w-3 text-orange-500" />
                    )}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pb-2">
                    <div className="text-[10px] text-stone-400 space-y-0.5">
                      {schema.columns.map((col) => (
                        <div key={col.name} className="flex items-center gap-1.5">
                          <span className="font-mono text-stone-600">{col.name}</span>
                          <span className="text-stone-400">({col.type})</span>
                          {col.comment && <span className="text-stone-400">— {col.comment}</span>}
                        </div>
                      ))}
                    </div>
                    <Separator />
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-medium">添加备注帮助 AI 理解:</label>
                      {editingNote === schema.name ? (
                        <div className="flex gap-1">
                          <Input
                            className="h-7 text-xs"
                            value={noteInput}
                            onChange={(e) => setNoteInput(e.target.value)}
                            placeholder="例如：这是用户订单表..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                onUpdateNote(schema.name, noteInput);
                                setEditingNote(null);
                              }
                            }}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs bg-orange-600 hover:bg-orange-700"
                            onClick={() => {
                              onUpdateNote(schema.name, noteInput);
                              setEditingNote(null);
                            }}
                          >
                            保存
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="text-xs text-stone-500 hover:text-orange-600 flex items-center gap-1"
                          onClick={() => {
                            setEditingNote(schema.name);
                            setNoteInput(tableNotes[schema.name] || '');
                          }}
                        >
                          <StickyNote className="h-3 w-3" />
                          {tableNotes[schema.name] || '点击添加备注'}
                        </button>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  );
}
