import React from 'react';

interface DataVisualizerProps {
  data: any;
}

// Simple recursive component to visualize data as wireframe blocks
const DataNode: React.FC<{ data: any; label?: string; depth: number }> = ({ data, label, depth }) => {
  const isArray = Array.isArray(data);
  const isObject = typeof data === 'object' && data !== null && !isArray;

  if (depth > 4) return <div className="text-zinc-700 font-mono text-[10px] pl-2">...</div>;

  if (isArray) {
    const isUniform = data.length > 0 && typeof data[0] === 'object' && data[0] !== null;
    
    if (isUniform && data.length > 0) {
      const keys = Object.keys(data[0]);
      return (
        <div className="my-2 border border-zinc-800">
          <div className="bg-zinc-900/50 border-b border-zinc-800 px-2 py-1 flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">{label || 'Table'} [{data.length}]</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  {keys.map(k => (
                    <th key={k} className="border-r border-zinc-800 last:border-0 px-2 py-1 text-[10px] font-mono text-zinc-600 font-normal uppercase">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 10).map((row: any, i: number) => (
                  <tr key={i} className="border-t border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                    {keys.map(k => (
                      <td key={k} className="border-r border-zinc-800/50 last:border-0 px-2 py-1 text-[10px] font-mono text-zinc-400 truncate max-w-[150px]">
                        {typeof row[k] === 'object' ? '{...}' : String(row[k])}
                      </td>
                    ))}
                  </tr>
                ))}
                {data.length > 10 && (
                  <tr>
                    <td colSpan={keys.length} className="px-2 py-1 text-[10px] text-zinc-700 italic text-center bg-zinc-950">
                      + {data.length - 10} more rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
  }

  if (isObject) {
    return (
      <div className={`my-1 ${depth > 0 ? 'pl-3 border-l border-zinc-800' : ''}`}>
        {label && <div className="text-[10px] font-mono text-blue-500 mb-1">{label}:</div>}
        {Object.entries(data).map(([k, v]) => (
          <DataNode key={k} data={v} label={k} depth={depth + 1} />
        ))}
      </div>
    );
  }

  // Primitive
  return (
    <div className="flex items-baseline gap-2 py-0.5">
      {label && <span className="text-[10px] font-mono text-zinc-600 w-20 shrink-0 truncate">{label}</span>}
      <span className="text-[11px] font-mono text-zinc-300 break-all">{String(data)}</span>
    </div>
  );
};

export const ToonPreview: React.FC<DataVisualizerProps> = ({ data }) => {
  return (
    <div className="h-full overflow-auto p-8">
      <div className="mb-6">
        <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-500 mb-2">Data Structure Visualizer</h2>
        <div className="h-px w-full bg-zinc-800"></div>
      </div>
      <DataNode data={data} depth={0} />
    </div>
  );
};