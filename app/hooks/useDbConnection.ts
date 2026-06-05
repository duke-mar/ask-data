'use client';

import { useState, useCallback, useEffect } from 'react';
import { DbConfig, TableSchema } from '@/app/types';
import { storage } from '@/app/lib/storage';
import { generateId } from '@/app/lib/utils';

export function useDbConnection() {
  const [configs, setConfigs] = useState<DbConfig[]>([]);
  const [activeDbId, setActiveDbId] = useState<string | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [schemas, setSchemas] = useState<TableSchema[]>([]);
  const [tableNotes, setTableNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setConfigs(storage.getDbConfigs());
    setActiveDbId(storage.getActiveDb());
  }, []);

  const activeDb = configs.find((c) => c.id === activeDbId) || null;

  const addConfig = useCallback(
    async (config: Omit<DbConfig, 'id' | 'createdAt'>) => {
      const newConfig: DbConfig = {
        ...config,
        id: generateId(),
        createdAt: Date.now(),
      };
      storage.addDbConfig(newConfig);
      setConfigs((prev) => [...prev, newConfig]);
      return newConfig;
    },
    []
  );

  const removeConfig = useCallback((id: string) => {
    storage.removeDbConfig(id);
    setConfigs((prev) => prev.filter((c) => c.id !== id));
    if (activeDbId === id) {
      setActiveDbId(null);
      storage.setActiveDb(null);
    }
  }, [activeDbId]);

  const selectDb = useCallback((id: string | null) => {
    setActiveDbId(id);
    storage.setActiveDb(id);
    setTables([]);
    setSelectedTables([]);
    setSchemas([]);
    setTableNotes({});
  }, []);

  const loadTables = useCallback(async (db: DbConfig) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        host: db.host,
        port: String(db.port),
        user: db.user,
        password: db.password,
        database: db.database,
      });
      const res = await fetch(`/api/db/tables?${params}`);
      const data = await res.json();
      setTables(data.tables || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSchemas = useCallback(async (db: DbConfig, tableNames: string[]) => {
    if (tableNames.length === 0) {
      setSchemas([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        host: db.host,
        port: String(db.port),
        user: db.user,
        password: db.password,
        database: db.database,
        tables: tableNames.join(','),
      });
      const res = await fetch(`/api/db/schemas?${params}`);
      const data = await res.json();
      setSchemas(data.schemas || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTableNote = useCallback((tableName: string, note: string) => {
    setTableNotes((prev) => ({ ...prev, [tableName]: note }));
  }, []);

  return {
    configs,
    activeDb,
    activeDbId,
    tables,
    selectedTables,
    setSelectedTables,
    schemas,
    tableNotes,
    loading,
    addConfig,
    removeConfig,
    selectDb,
    loadTables,
    loadSchemas,
    updateTableNote,
  };
}
