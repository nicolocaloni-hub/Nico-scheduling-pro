import React, { useEffect, useState } from 'react';

export type ImportState = 'idle' | 'selected' | 'uploading' | 'analyzing' | 'done' | 'error';

interface AiStatusBarProps {
  status: ImportState;
  fileName: string | null;
  model?: string;
}

export const AiStatusBar: React.FC<AiStatusBarProps> = ({ status, fileName, model }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'uploading' || status === 'analyzing') {
      const start = Date.now();
      setElapsed(0);
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'idle': return 'PRONTO';
      case 'selected': return 'FILE SELEZIONATO';
      case 'uploading': return 'CARICAMENTO...';
      case 'analyzing': return 'ANALISI AI IN CORSO...';
      case 'done': return 'COMPLETATO';
      case 'error': return 'ERRORE';
      default: return status.toUpperCase();
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'idle': return 'bg-gray-700 text-gray-300';
      case 'selected': return 'bg-blue-900/50 text-blue-200 border-blue-500/30';
      case 'uploading': return 'bg-yellow-900/30 text-yellow-200 border-yellow-500/30';
      case 'analyzing': return 'bg-purple-900/30 text-purple-200 border-purple-500/30';
      case 'done': return 'bg-green-900/30 text-green-200 border-green-500/30';
      case 'error': return 'bg-red-900/30 text-red-200 border-red-500/30';
      default: return 'bg-gray-800';
    }
  };

  return (
    <div className={`w-full rounded-xl border flex items-center justify-between px-4 py-3 transition-all duration-300 ${getStatusColor()} border-opacity-50`}>
      <div className="flex items-center gap-4 overflow-hidden">
        {/* Status Indicator */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {(status === 'uploading' || status === 'analyzing') && (
            <div className="w-2 h-2 rounded-full bg-current animate-ping" />
          )}
          <span className="text-xs font-black tracking-widest uppercase">
            {getStatusLabel()}
          </span>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-current opacity-20 flex-shrink-0" />

        {/* Filename */}
        <div className="flex items-center gap-2 min-w-0">
          <i className="fa-solid fa-file-pdf opacity-70 text-sm" />
          <span className="text-sm font-medium truncate opacity-90" title={fileName || ''}>
            {fileName || 'Nessun file selezionato'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
        {/* Model Info */}
        {model && (
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-black/20">
            <i className="fa-solid fa-robot text-[10px] opacity-70" />
            <span className="text-[10px] font-mono opacity-80">{model}</span>
          </div>
        )}

        {/* Timer */}
        {(status === 'uploading' || status === 'analyzing' || elapsed > 0) && (
          <div className="font-mono text-xs opacity-80 tabular-nums">
            {formatTime(elapsed)}
          </div>
        )}
      </div>
    </div>
  );
};
