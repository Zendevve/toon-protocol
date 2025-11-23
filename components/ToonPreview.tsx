import React, { useState, useEffect, useMemo } from 'react';

interface DataVisualizerProps {
  data: any;
}

// --- Helper: Highlight Text ---
const Highlight: React.FC<{ text: string; term: string; className?: string }> = ({ text, term, className }) => {
  if (!term || !text.toLowerCase().includes(term.toLowerCase())) {
    return <span className={className}>{text}</span>;
  }
  const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <span className={className}>
      {parts.map((part, i) => 
        part.toLowerCase() === term.toLowerCase() 
          ? <span key={i} className="bg-yellow-900/60 text-yellow-200 font-bold px-0.5 rounded-[1px] border border-yellow-700/50">{part}</span> 
          : part
      )}
    </span>
  );
};

// --- Helper: Check deep match ---
const hasDeepMatch = (data: any, term: string): boolean => {
  if (!term) return false;
  const t = term.toLowerCase();
  
  if (data === null) return 'null'.includes(t);
  if (typeof data !== 'object') return String(data).toLowerCase().includes(t);
  
  if (Array.isArray(data)) {
    return data.some(item => hasDeepMatch(item, term));
  }
  
  return Object.entries(data).some(([k, v]) => 
    k.toLowerCase().includes(t) || hasDeepMatch(v, term)
  );
};

interface DataNodeProps {
  data: any;
  label?: string;
  depth: number;
  searchTerm: string;
  expandAction: { type: 'expand' | 'collapse'; id: number } | null;
}

const DataNode: React.FC<DataNodeProps> = ({ data, label, depth, searchTerm, expandAction }) => {
  const [expanded, setExpanded] = useState(depth < 1);

  // Type Detection
  const isArray = Array.isArray(data);
  const isObject = typeof data === 'object' && data !== null && !isArray;
  const isEmpty = (isArray && data.length === 0) || (isObject && Object.keys(data).length === 0);
  
  // Uniform Array Detection (for table view)
  const isUniform = isArray && data.length > 0 && 
    typeof data[0] === 'object' && 
    data[0] !== null && 
    !Array.isArray(data[0]);

  // Search Matching
  const selfMatch = label ? label.toLowerCase().includes(searchTerm.toLowerCase()) : false;
  const primitiveMatch = !isObject && !isArray && String(data).toLowerCase().includes(searchTerm.toLowerCase());
  const containsMatch = useMemo(() => 
    searchTerm ? hasDeepMatch(data, searchTerm) : false
  , [data, searchTerm]);

  // Handle Expansion logic
  useEffect(() => {
    if (expandAction) {
        setExpanded(expandAction.type === 'expand');
    }
  }, [expandAction]);

  useEffect(() => {
      if (searchTerm && (selfMatch || primitiveMatch || containsMatch)) {
          setExpanded(true);
      }
  }, [searchTerm, selfMatch, primitiveMatch, containsMatch]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  if (depth > 50) return <div className="text-red-500 text-[10px] pl-4 border-l border-red-900">Max Depth Exceeded</div>;

  // Styling for tree lines
  const indentClass = "ml-3 pl-3";
  const borderClass = "border-l border-zinc-800";

  // --- RENDER: Uniform Table ---
  if (isUniform) {
    const filteredData = searchTerm 
        ? data.filter((row: any) => Object.values(row).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase())))
        : data;
    
    if (searchTerm && filteredData.length === 0 && !selfMatch) return null;

    const keys = Object.keys(data[0]);

    return (
      <div className={`relative ${depth > 0 ? indentClass : ''} ${depth > 0 ? borderClass : ''} group/node`}>
        {/* Node Header */}
        <div 
            className="flex items-center gap-2 py-1 cursor-pointer hover:bg-zinc-900/30 select-none -ml-3 pl-3 transition-colors"
            onClick={toggle}
        >
            <span className="w-3 h-3 flex items-center justify-center text-[9px] text-zinc-600 group-hover/node:text-zinc-400 font-mono">
                {expanded ? '▼' : '▶'}
            </span>
            
            {label && (
               <span className="text-[11px] font-mono text-zinc-500">
                  <Highlight text={label} term={searchTerm} />
                  <span className="text-zinc-600 mx-1">:</span>
               </span>
            )}
            
            <span className="text-[9px] font-mono text-cyan-700 border border-cyan-900/30 bg-cyan-950/10 px-1 rounded">
                TABLE [{filteredData.length !== data.length ? `${filteredData.length}/${data.length}` : data.length}]
            </span>
        </div>

        {/* Table View */}
        {expanded && (
             <div className="mt-1 mb-2 overflow-x-auto border-l border-zinc-800 ml-[5px] pl-3">
                <div className="border border-zinc-800 bg-black/40 inline-block min-w-full">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr>
                                <th className="px-2 py-1 text-[9px] font-mono text-zinc-500 border-b border-zinc-800 bg-zinc-900/50">#</th>
                                {keys.map(k => (
                                    <th key={k} className="px-2 py-1 text-[9px] font-mono text-zinc-400 border-b border-l border-zinc-800 bg-zinc-900/50 whitespace-nowrap">
                                        <Highlight text={k} term={searchTerm} />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.slice(0, 100).map((row: any, idx: number) => (
                                <tr key={idx} className="hover:bg-zinc-900/30 transition-colors group/row">
                                    <td className="px-2 py-0.5 text-[10px] font-mono text-zinc-600 border-b border-zinc-800/30">{idx}</td>
                                    {keys.map(k => (
                                        <td key={k} className="px-2 py-0.5 text-[10px] font-mono text-zinc-300 border-b border-l border-zinc-800/30 max-w-[200px] truncate">
                                            {typeof row[k] === 'object' ? '...' : <Highlight text={String(row[k])} term={searchTerm} />}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredData.length > 100 && (
                        <div className="px-2 py-1 text-[9px] text-zinc-600 italic text-center bg-zinc-900/20">
                            ... {filteredData.length - 100} more rows
                        </div>
                    )}
                </div>
             </div>
        )}
      </div>
    );
  }

  // --- RENDER: Object / Generic Array ---
  if (isObject || isArray) {
    if (searchTerm && !selfMatch && !containsMatch) return null;

    const typeLabel = isArray ? `Array(${data.length})` : 'Object';
    
    return (
      <div className={`relative ${depth > 0 ? indentClass : ''} ${depth > 0 ? borderClass : ''} group/node`}>
          <div 
            className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-zinc-900/30 select-none -ml-3 pl-3 transition-colors"
            onClick={toggle}
          >
            <span className="w-3 h-3 flex items-center justify-center text-[9px] text-zinc-600 group-hover/node:text-zinc-400 font-mono">
                {expanded ? '▼' : '▶'}
            </span>
            
            {label && (
               <span className="text-[11px] font-mono text-zinc-500 group-hover/node:text-zinc-300 transition-colors">
                  <Highlight text={label} term={searchTerm} />
                  <span className="text-zinc-600 mx-1">:</span>
               </span>
            )}
            
            <span className="text-[9px] font-mono text-zinc-600">
               {isEmpty ? (isArray ? '[]' : '{}') : typeLabel}
            </span>
          </div>

          {expanded && !isEmpty && (
              <div className=""> 
                 {isArray 
                   ? data.map((item: any, i: number) => (
                       <DataNode 
                         key={i} 
                         data={item} 
                         label={String(i)} 
                         depth={depth + 1} 
                         searchTerm={searchTerm} 
                         expandAction={expandAction}
                       />
                   ))
                   : Object.entries(data).map(([k, v]) => (
                       <DataNode 
                         key={k} 
                         data={v} 
                         label={k} 
                         depth={depth + 1} 
                         searchTerm={searchTerm} 
                         expandAction={expandAction}
                       />
                   ))
                 }
              </div>
          )}
      </div>
    );
  }

  // --- RENDER: Primitive ---
  if (searchTerm && !selfMatch && !primitiveMatch) return null;

  // Type coloring
  let valueColor = "text-zinc-300";
  let typeIndicator = "";
  
  if (typeof data === 'number') {
      valueColor = "text-blue-400";
      typeIndicator = "num";
  }
  else if (typeof data === 'boolean') {
      valueColor = "text-purple-400";
      typeIndicator = "bool";
  }
  else if (data === null) {
      valueColor = "text-red-900/50 italic";
      typeIndicator = "null";
  }
  else if (typeof data === 'string') {
      valueColor = "text-emerald-100/70";
      typeIndicator = "str";
  }

  return (
     <div className={`relative ${depth > 0 ? indentClass : ''} ${depth > 0 ? borderClass : ''} flex items-center hover:bg-zinc-900/30 py-0.5 pl-3 -ml-3 transition-colors group/leaf`}>
         {/* Visual tick for leaf node */}
         <div className="absolute left-0 top-1/2 w-2.5 h-[1px] bg-zinc-800 -ml-2.5"></div>
         
         {label && (
             <span className="text-[11px] font-mono text-zinc-500 whitespace-nowrap mr-2 z-10">
                 <Highlight text={label} term={searchTerm} />:
             </span>
         )}
         
         <span className={`text-[11px] font-mono break-all z-10 ${valueColor}`}>
            {typeof data === 'string' 
                ? <>"<Highlight text={data} term={searchTerm} />"</> 
                : <Highlight text={String(data)} term={searchTerm} />
            }
         </span>
         
         {/* Type Badge on hover */}
         <span className="ml-2 text-[7px] text-zinc-700 uppercase tracking-wider opacity-0 group-hover/leaf:opacity-100 transition-opacity select-none border border-zinc-800 px-1 rounded bg-black">
             {typeIndicator}
         </span>
     </div>
  );
};

export const ToonPreview: React.FC<DataVisualizerProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandAction, setExpandAction] = useState<{ type: 'expand' | 'collapse'; id: number } | null>(null);

  const triggerExpand = (type: 'expand' | 'collapse') => {
      setExpandAction({ type, id: Date.now() });
  };

  return (
    <div className="h-full flex flex-col bg-[#050505]">
       {/* Toolbar */}
       <div className="flex-none p-3 border-b border-zinc-900 flex flex-col gap-3 bg-[#050505]/95 backdrop-blur z-10">
          <div className="flex justify-between items-center">
             <h2 className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500">
                 Data Topology
             </h2>
             <div className="flex gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse delay-75"></span>
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse delay-150"></span>
             </div>
          </div>
          
          <div className="flex gap-2">
              <div className="relative flex-grow group">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <span className="text-zinc-600 text-xs group-focus-within:text-zinc-400 transition-colors">/</span>
                  </div>
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="FILTER NODES..."
                    className="w-full bg-zinc-900/30 border border-zinc-800 text-zinc-300 text-[10px] font-mono rounded-sm py-1.5 pl-6 pr-2 focus:outline-none focus:border-zinc-600 focus:bg-zinc-900 placeholder-zinc-700 uppercase tracking-wide transition-all"
                  />
                  {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm("")}
                        className="absolute inset-y-0 right-0 pr-2 flex items-center text-zinc-600 hover:text-zinc-300"
                      >
                          ×
                      </button>
                  )}
              </div>
              <button 
                onClick={() => triggerExpand('expand')}
                className="px-3 py-1 border border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900 text-[9px] font-mono uppercase tracking-wider transition-all"
                title="Expand All"
              >
                Exp
              </button>
              <button 
                onClick={() => triggerExpand('collapse')}
                className="px-3 py-1 border border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900 text-[9px] font-mono uppercase tracking-wider transition-all"
                title="Collapse All"
              >
                Col
              </button>
          </div>
       </div>

       {/* Tree View */}
       <div className="flex-grow overflow-auto p-6 custom-scrollbar bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiMxYTFhMWEiIG9wYWNpdHk9IjAuMyIvPjwvc3ZnPg==')]">
         {data ? (
            <div className="animate-in fade-in duration-500 pl-1">
              <DataNode 
                data={data} 
                label="ROOT" 
                depth={0} 
                searchTerm={searchTerm}
                expandAction={expandAction}
              />
              <div className="mt-8 pt-4 border-t border-zinc-900 ml-4 text-center opacity-50">
                 <span className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest">End of Stream</span>
              </div>
            </div>
         ) : (
           <div className="h-full flex items-center justify-center text-zinc-800 text-xs font-mono uppercase tracking-widest">
              No Data Stream
           </div>
         )}
       </div>
    </div>
  );
};