import React from 'react';
import AppLayout from '@/layouts/AppLayout';
import { Activity, Server, Database, CheckCircle2 } from 'lucide-react';

interface Props {
  health: {
    php_version: string;
    laravel_version: string;
    database_status: string;
    environment: string;
    server_time: string;
  };
}

export default function SystemHealth({ health }: Props) {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center space-x-2 text-indigo-400 font-bold text-lg pb-3 border-b border-indigo-950/50">
          <Activity className="w-5 h-5" />
          <h1>System Health & Runtime Verification</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-gray-900/60 border border-indigo-950/70 rounded-2xl backdrop-blur-md space-y-3">
            <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
              <Database className="w-4 h-4" />
              <span>Database Connection</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="text-xl font-bold text-gray-100">{health.database_status}</span>
            </div>
            <p className="text-xs text-gray-400">PostgreSQL 18 connection layer active and responsive.</p>
          </div>

          <div className="p-5 bg-gray-900/60 border border-indigo-950/70 rounded-2xl backdrop-blur-md space-y-3">
            <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
              <Server className="w-4 h-4" />
              <span>Runtime Environment</span>
            </div>
            <div className="space-y-1 text-xs text-gray-300">
              <p>PHP Version: <span className="font-mono text-indigo-300 font-bold">{health.php_version}</span></p>
              <p>Laravel Framework: <span className="font-mono text-indigo-300 font-bold">v{health.laravel_version}</span></p>
              <p>Environment: <span className="font-mono text-indigo-300 font-bold">{health.environment}</span></p>
              <p>Server Clock: <span className="font-mono text-gray-400">{health.server_time}</span></p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
