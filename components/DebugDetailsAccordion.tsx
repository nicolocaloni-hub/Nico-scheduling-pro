import React from 'react';

interface DebugDetailsAccordionProps {
  logs: string[];
  isOpen: boolean;
  onToggle: () => void;
  error: string | null;
  onClearLogs: () => void;
  onCheckEnv: () => void;
}

export const DebugDetailsAccordion: React.FC<DebugDetailsAccordionProps> = ({
  logs,
  isOpen,
  onToggle,
  error,
  onClearLogs,
  onCheckEnv
}) => {
  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden bg-black/20">
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-2 text-xs font-medium transition-colors ${
          error ? 'bg-red-900/20 text-red-300 hover:bg-red-900/30' : 'bg-gray-900/50 text-gray-400 hover:bg-gray-900'
        }`}
      >
        <span className="flex items-center gap-2">
          <i className={`fa-solid fa-chevron-right transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          {error ? 'ERRORE - Mostra Dettagli Tecnici' : 'Dettagli Tecnici & Log'}
        </span>
        {logs.length > 0 && <span className="opacity-50">{logs.length} eventi</span>}
      </button>

      {isOpen && (
        <div className="p-4 bg-black/40 border-t border-gray-800">
          <div className="font-mono text-[10px] space-y-1 h-64 overflow-y-auto no-scrollbar text-gray-500">
            {logs.length === 0 && <p className="opacity-30 italic">Nessun log registrato.</p>}
            {logs.map((log, i) => (
              <div key={i} className={`py-0.5 border-l-2 pl-2 break-all ${
                log.includes('[ERROR]') || log.includes('[CRITICAL]') ? 'border-red-500 text-red-400 bg-red-500/5' : 
                log.includes('[UI]') ? 'border-blue-500 text-blue-400' : 
                log.includes('[SERVER]') ? 'border-green-500 text-green-400' : 'border-gray-700'
              }`}>
                {log}
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-red-400 text-[11px] leading-tight font-mono">
              <strong className="block text-[9px] uppercase font-black text-red-500 mb-1">Error Trace:</strong>
              {error}
            </div>
          )}

          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-800/50">
            <button 
              onClick={onClearLogs}
              className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-[10px] text-gray-300 transition-colors"
            >
              Clear Logs
            </button>
            <button 
              onClick={onCheckEnv}
              className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-[10px] text-gray-300 transition-colors"
            >
              Check Server Env
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
