'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface DbConnectionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (config: { name: string; host: string; port: number; user: string; password: string; database: string; description?: string }) => void;
}

export function DbConnectionForm({ open, onOpenChange, onSubmit }: DbConnectionFormProps) {
  const [form, setForm] = useState({
    name: '',
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: '',
    description: '',
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/db/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: form.host,
          port: Number(form.port),
          user: form.user,
          password: form.password,
          database: form.database,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: unknown) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = () => {
    onSubmit({
      name: form.name || `${form.host}/${form.database}`,
      host: form.host,
      port: Number(form.port),
      user: form.user,
      password: form.password,
      database: form.database,
      description: form.description,
    });
    setForm({ name: '', host: 'localhost', port: 3306, user: 'root', password: '', database: '', description: '' });
    setTestResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>添加数据库连接</DialogTitle>
          <DialogDescription>配置 MySQL 数据库连接信息</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label>连接名称</Label>
            <Input placeholder="例如：生产环境数据库" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>主机地址</Label>
              <Input placeholder="localhost" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>端口</Label>
              <Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>用户名</Label>
              <Input value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>密码</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>数据库名</Label>
            <Input value={form.database} onChange={(e) => setForm({ ...form, database: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>备注描述（可选）</Label>
            <Input placeholder="描述该数据库的用途，帮助 AI 理解" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          {testResult && (
            <div className={`text-sm rounded-md px-3 py-2 ${testResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {testResult.message}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={testConnection} disabled={testing} className="flex-1">
              {testing ? '测试中...' : '测试连接'}
            </Button>
            <Button onClick={handleSubmit} className="flex-1 bg-orange-600 hover:bg-orange-700">
              保存连接
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
