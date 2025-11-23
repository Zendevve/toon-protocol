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
          ? <span key={i} className="bg-yellow-900/80 text-yellow-50 font-bold px-0.5 rounded-[1px]">{part}</span> 
          : part
      )}
    </span>
  );
};

// --- Helper: Check deep match for auto-expansion ---
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
  const [expanded, setExpanded] = useState(depth < 1); // Default open only root
  const [hover, setHover] = useState(false);

  // Derived State
  const isArray = Array.isArray(data);
  const isObject = typeof data === 'object' && data !== null && !isArray;
  const isEmpty = (isArray && data.length === 0) || (isObject && Object.keys(data).length === 0);
  
  // Uniform Array Detection
  const isUniform = isArray && data.length > 0 && 
    typeof data[0] === 'object' && 
    data[0] !== null && 
    !Array.isArray(data[0]);

  // Search Logic
  const selfMatch = label ? label.toLowerCase().includes(searchTerm.toLowerCase()) : false;
  const primitiveMatch = !isObject && !isArray && String(data).toLowerCase().includes(searchTerm.toLowerCase());
  const containsMatch = useMemo(() => 
    searchTerm ? hasDeepMatch(data, searchTerm) : false
  , [data, searchTerm]);

  // Effects
  useEffect(() => {
    if (searchTerm && (selfMatch || primitiveMatch || containsMatch)) {
      setExpanded(true);
    } else if (!searchTerm && expandAction) {
      setExpanded(expandAction.type === 'expand');
    }
  }, [searchTerm, expandAction, selfMatch, primitiveMatch, containsMatch]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  if (depth > 20) return <div className="text-zinc-800 text-[10px] pl-4">...depth limit...</div>;

  // --- RENDER: Uniform Table ---
  if (isUniform) {
    // Filter rows for search
    const filteredData = searchTerm 
        ? data.filter((row: any) => Object.values(row).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase())))
        : data;
    
    const keys = Object.keys(data[0]);
    
    if (searchTerm && filteredData.length === 0 && !selfMatch) return null; // Hide if no matches in table or label

    return (
      <div className="my-1 pl-4 border-l border-zinc-800/50 hover:border-zinc-700 transition-colors relative group">
        <div 
          className="flex items-center gap-2 cursor-pointer py-1 select-none"
          onClick={toggle}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
           <span className={`text-[10px] font-mono transition-transform duration-200 text-zinc-500 ${expanded ? 'rotate-90' : ''} ${hover ? 'text-white' : ''}`}>▶</span>
           {label && <Highlight text={label} term={searchTerm} className="text-[10px] font-mono text-zinc-400 group-hover:text-zinc-300" />}
           <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider bg-zinc-900 px-1 rounded border border-zinc-800">
             Table [{filteredData.length !== data.length ? `${filteredData.length}/${data.length}` : data.length}]
           </span>
        </div>

        {expanded && (
          <div className="overflow-x-auto mt-1 border border-zinc-800 bg-zinc-950/50">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-[9px] font-mono text-zinc-500 font-bold border-b border-zinc-800 bg-zinc-900/30">#</th>
                  {keys.map(k => (
                    <th key={k} className="px-3 py-2 text-[9px] font-mono text-zinc-400 font-normal uppercase border-b border-l border-zinc-800 bg-zinc-900/30 whitespace-nowrap">
                        <Highlight text={k} term={searchTerm} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, 50).map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors group/row">
                    <td className="px-3 py-1 text-[10px] font-mono text-zinc-600 border-b border-zinc-800/50">{i}</td>
                    {keys.map(k => (
                      <td key={k} className="px-3 py-1 text-[10px] font-mono text-zinc-300 border-b border-l border-zinc-800/50 truncate max-w-[200px]">
                         {typeof row[k] === 'object' 
                            ? <span className="text-zinc-600 italic">{'{...}'}</span> 
                            : <Highlight text={String(row[k])} term={searchTerm} />
                         }
                      </td>
                    ))}
                  </tr>
                ))}
                {filteredData.length > 50 && (
                    <tr>
                        <td colSpan={keys.length + 1} className="px-3 py-2 text-[9px] text-zinc-600 text-center italic bg-zinc-900/20">
                            ... {filteredData.length - 50} more items
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // --- RENDER: Object / Generic Array ---
  if (isObject || isArray) {
    if (searchTerm && !selfMatch && !containsMatch) return null; // Hide structure if no deep match

    const typeLabel = isArray ? `Array(${data.length})` : `Object`;
    
    return (
      <div className="my-0.5 pl-4 border-l border-zinc-800/50 hover:border-zinc-700 transition-colors relative group">
        <div 
          className="flex items-center gap-2 cursor-pointer py-0.5 select-none"
          onClick={toggle}
        >
           <div className={`w-3 h-3 flex items-center justify-center transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
             <span className="text-[8px] text-zinc-500">▶</span>
           </div>
           
           {label && (
               <>
                <Highlight text={label} term={searchTerm} className="text-[11px] font-mono text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                <span className="text-[11px] font-mono text-zinc-600 mr-1">:</span>
               </>
           )}
           
           <span className="text-[9px] font-mono text-zinc-600 group-hover:text-zinc-500">
              {isEmpty ? (isArray ? '[]' : '{}') : typeLabel}
           </span>
        </div>

        {expanded && !isEmpty && (
           <div className="transition-all duration-200">
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

  let valueColor = "text-zinc-300";
  if (typeof data === 'number') valueColor = "text-blue-200";
  if (typeof data === 'boolean') valueColor = "text-purple-300";
  if (data === null) valueColor = "text-zinc-600 italic";
  if (typeof data === 'string') valueColor = "text-green-100/80";

  return (
    <div className="flex items-baseline gap-2 pl-4 py-0.5 border-l border-transparent hover:border-zinc-800 hover:bg-zinc-900/30 transition-colors -ml-[1px] select-text">
       {label && (
           <div className="whitespace-nowrap">
                <Highlight text={label} term={searchTerm} className="text-[11px] font-mono text-zinc-500 select-none" />
                <span className="text-[11px] font-mono text-zinc-600 select-none">:</span>
           </div>
       )}
       <span className={`text-[11px] font-mono break-all ${valueColor}`}>
         {typeof data === 'string' 
            ? <>"<Highlight text={data} term={searchTerm} />"</>
            : <Highlight text={String(data)} term={searchTerm} />
         }
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
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
             </div>
          </div>
          
          <div className="flex gap-2">
              <div className="relative flex-grow group">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <span className="text-zinc-600 text-xs group-focus-within:text-zinc-400">/</span>
                  </div>
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter nodes..."
                    className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-300 text-[10px] font-mono rounded-sm py-1.5 pl-6 pr-2 focus:outline-none focus:border-zinc-600 focus:bg-zinc-900 placeholder-zinc-700 uppercase tracking-wide"
                  />
                  {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm("")}
                        className="absolute inset-y-0 right-0 pr-2 flex items-center text-zinc-600 hover:text-zinc-30