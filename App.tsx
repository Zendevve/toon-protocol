import React, { useState, useCallback } from 'react';
import { generateDataFromPrompt } from './services/geminiService';
import { GenerationStatus, TokenStats, ViewMode } from './types';
import { CodeBlock } from './components/CodeBlock';
import { ToonPreview } from './components/ToonPreview';
import { convertToToon, calculateTokenStats, decodeToon } from './utils/toonEncoder';

const EXAMPLE_PROMPT = "A dataset of 20 spaceships with stats like speed, shield capacity, crew size, and captain name.";

const App: React.FC = () => {
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPT);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [jsonData, setJsonData] = useState<any>(null);
  const [jsonString, setJsonString] = useState<string>("");
  const [toonString, setToonString] = useState<string>("");
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('toon');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [headerCopyStatus, setHeaderCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [jsonCopyStatus, setJsonCopyStatus] = useState<'idle' | 'copied'>('idle');

  // Input Validation State
  const [validationStatus, setValidationStatus] = useState<'valid' | 'empty' | 'short'>('valid');

  // Effect to validate input in real-time
  React.useEffect(() => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setValidationStatus('empty');
    } else if (trimmed.length < 10) {
      setValidationStatus('short');
    } else {
      setValidationStatus('valid');
    }
  }, [prompt]);

  const handleGenerate = useCallback(async () => {
    if (validationStatus !== 'valid') return;
    
    setStatus('loading');
    setErrorMsg(null);
    setIsVerified(false);
    
    try {
      const data = await generateDataFromPrompt(prompt);
      const jsonStr = JSON.stringify(data, null, 2);
      const toonStr = convertToToon(data);
      
      // Verify Integrity
      let verified = false;
      try {
        const decoded = decodeToon(toonStr);
        // Simple equality check (for demo purposes, strict equality might fail on key order but JSON structure should match)
        // We normalize by stringifying both
        if (JSON.stringify(decoded) === JSON.stringify(data)) {
            verified = true;
        } else {
            console.warn("Verification Mismatch", { original: data, decoded });
        }
      } catch (e) {
        console.error("Verification Error", e);
      }

      setJsonData(data);
      setJsonString(jsonStr);
      setToonString(toonStr);
      setStats(calculateTokenStats(jsonStr, toonStr));
      setIsVerified(verified);
      setStatus('success');
      setViewMode('toon'); 
    } catch (err: any) {
      console.error(err);
      // Use the specific error message from the service or fallback
      const message = err instanceof Error ? err.message : "Generation Failed. System Malfunction.";
      setErrorMsg(message);
      setStatus('error');
    }
  }, [prompt, validationStatus]);

  const handleHeaderCopy = () => {
    if (!toonString) return;
    navigator.clipboard.writeText(toonString);
    setHeaderCopyStatus('copied');
    setTimeout(() => setHeaderCopyStatus('idle'), 2000);
  };

  const handleJsonCopy = () => {
    if (!jsonString) return;
    navigator.clipboard.writeText(jsonString);
    setJsonCopyStatus('copied');
    setTimeout(() => setJsonCopyStatus('idle'), 2000);
  };

  const handleClear = () => {
    setPrompt("");
    setStatus('idle');
    setJsonData(null);
    setJsonString("");
    setToonString("");
    setStats(null);
    setErrorMsg(null);
    setIsVerified(false);
  };

  const handleExport = (format: 'toon' | 'json' | 'md' | 'txt') => {
    if (!toonString || !jsonString) return;
    
    let content = "";
    let filename = "generated_data";
    let mimeType = "text/plain";

    const timestamp = new Date().toISOString().slice(0,10);

    switch (format) {
        case 'toon':
            content = toonString;
            filename = `toon_data_${timestamp}.toon`;
            break;
        case 'json':
            content = jsonString;
            filename = `data_${timestamp}.json`;
            mimeType = "application/json";
            break;
        case 'md':
            content = `# TOON Data Export\n\n## TOON Format\n\`\`\`toon\n${toonString}\n\`\`\`\n\n## JSON Source\n\`\`\`json\n${jsonString}\n\`\`\``;
            filename = `toon_export_${timestamp}.md`;
            break;
        case 'txt':
            content = toonString;
            filename = `toon_data_${timestamp}.txt`;
            break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen w-full bg-black flex flex-col overflow-hidden selection:bg-white selection:text-black">
      
      {/* Header */}
      <header className="flex-none h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-black z-20">
        <div className="flex items-center gap-3 group cursor-default">
          <div className="w-4 h-4 bg-white group-hover:animate-spin transition-transform"></div>
          <h1 className="font-bold text-lg tracking-tighter text-white">TOON<span className="text-zinc-600 font-light">PROTOCOL</span></h1>
        </div>
        <div className="flex items-center gap-6 text-[10px] font-mono uppercase text-zinc-500 tracking-widest">
          
          {status === 'success' && (
             <>
               {jsonString && (
                 <button 
                   onClick={handleJsonCopy}
                   className={`hidden sm:flex items-center gap-2 transition-colors ${jsonCopyStatus === 'copied' ? 'text-green-500' : 'hover:text-white'}`}
                 >
                   [{jsonCopyStatus === 'copied' ? 'COPIED' : 'COPY JSON'}]
                 </button>
               )}
               {toonString && (
                 <button 
                   onClick={handleHeaderCopy}
                   className={`hidden sm:flex items-center gap-2 transition-colors ${headerCopyStatus === 'copied' ? 'text-green-500' : 'hover:text-white'}`}
                 >
                   [{headerCopyStatus === 'copied' ? 'COPIED' : 'COPY TOON'}]
                 </button>
               )}
             </>
          )}

          <span className={status === 'loading' ? 'text-white animate-pulse' : ''}>
            SYSTEM: {status === 'loading' ? 'COMPILING...' : 'READY'}
          </span>
          <a href="https://github.com/toon-format/toon" target="_blank" className="hover:text-white transition-colors">DOCS</a>
        </div>
      </header>

      <main className="flex-grow flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT: Input & Controls */}
        <div className="w-full lg:w-[400px] flex-none flex flex-col border-r border-zinc-800 bg-[#030303] relative">
          
          {/* Prompt Area */}
          <div className="flex-grow flex flex-col relative">
             <div className="flex-none p-4 border-b border-zinc-900 flex justify-between items-end">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Input Matrix</span>
                <button 
                  onClick={handleClear}
                  className="text-[10px] font-mono uppercase tracking-widest text-zinc-700 hover:text-red-500 transition-colors"
                >
                  [CLEAR]
                </button>
             </div>
             <textarea
               value={prompt}
               onChange={(e) => setPrompt(e.target.value)}
               className="flex-grow w-full bg-transparent p-6 resize-none focus:outline-none font-mono text-sm leading-relaxed text-zinc-300 placeholder-zinc-700"
               placeholder="// Describe your data structure..."
               spellCheck={false}
             />
             
             {/* Validation Bar */}
             <div className={`flex-none h-1 w-full transition-colors duration-300
               ${validationStatus === 'valid' ? 'bg-zinc-800' : 
                 validationStatus === 'short' ? 'bg-yellow-900' : 'bg-red-900'}
             `}></div>
             
             <div className="flex-none px-4 py-1 text-[9px] font-mono text-right uppercase tracking-wider h-6">
                {validationStatus === 'short' && <span className="text-yellow-600">Input too short for meaningful generation</span>}
                {validationStatus === 'empty' && <span className="text-zinc-700">Waiting for input...</span>}
                {validationStatus === 'valid' && <span className="text-zinc-600">Input Validated</span>}
             </div>
          </div>

          {/* Action Area */}
          <div className="flex-none p-6 border-t border-zinc-800 bg-black">
             <button
               onClick={handleGenerate}
               disabled={status === 'loading' || validationStatus !== 'valid'}
               className={`w-full h-12 flex items-center justify-center font-mono text-xs font-bold tracking-[0.2em] uppercase border transition-all duration-200 relative overflow-hidden group
                 ${status === 'loading' 
                   ? 'border-zinc-800 text-zinc-600 cursor-wait' 
                   : validationStatus !== 'valid'
                      ? 'border-zinc-800 text-zinc-700 cursor-not-allowed opacity-50'
                      : 'border-zinc-700 text-white hover:border-white hover:bg-white hover:text-black'}`}
             >
               <span className="relative z-10">{status === 'loading' ? 'PROCESSING STREAM' : 'INITIATE SEQUENCE'}</span>
             </button>
             
             {errorMsg && (
               <div className="mt-4 p-3 border border-red-900/50 bg-red-950/10 text-red-500 text-[10px] font-mono uppercase tracking-wide text-center animate-pulse">
                 > ERROR: {errorMsg}
               </div>
             )}

             {/* Stats Widget */}
             {stats && status === 'success' && (
                <div className="mt-6 space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-mono uppercase text-zinc-500">
                     <span>Optimization Level</span>
                     <span className="text-white">{stats.savingsPercent > 0 ? '+' : ''}{stats.savingsPercent}%</span>
                  </div>
                  <div className="w-full h-1 bg-zinc-900 relative">
                     <div 
                       className="absolute top-0 left-0 h-full bg-white transition-all duration-1000 ease-out"
                       style={{ width: `${Math.max(5, stats.savingsPercent)}%` }}
                     ></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                     <div>
                       <div className="text-[9px] text-zinc-600 uppercase mb-1">Standard JSON</div>
                       <div className="text-lg font-light text-zinc-400">{stats.estimatedTokensJson.toLocaleString()} <span className="text-[9px]">tok</span></div>
                     </div>
                     <div>
                       <div className="text-[9px] text-white uppercase mb-1">TOON Format</div>
                       <div className="text-lg font-bold text-white">{stats.estimatedTokensToon.toLocaleString()} <span className="text-[9px]">tok</span></div>
                     </div>
                  </div>
                  
                  {/* Integrity Badge */}
                  <div className={`mt-4 border ${isVerified ? 'border-green-900 bg-green-950/10 text-green-600' : 'border-yellow-900 bg-yellow-950/10 text-yellow-600'} p-2 flex items-center justify-center gap-2`}>
                      <div className={`w-1.5 h-1.5 ${isVerified ? 'bg-green-500' : 'bg-yellow-500'} rounded-full`}></div>
                      <span className="text-[9px] font-mono uppercase tracking-widest">
                        {isVerified ? 'Integrity Verified' : 'Integrity Check Failed'}
                      </span>
                  </div>
                </div>
             )}
          </div>
        </div>

        {/* RIGHT: Output Viewport */}
        <div className="flex-grow flex flex-col bg-black min-w-0 relative">
          {/* Background Grid Effect */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiMxYTFhMWEiLz48L3N2Zz4=')] opacity-20 pointer-events-none"></div>
          
          {/* Toolbar */}
          <div className="flex-none h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-black/80 backdrop-blur-sm z-10">
             <div className="flex items-center gap-8 h-full">
                <button 
                  onClick={() => setViewMode('toon')}
                  className={`h-full flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest transition-colors border-b-2 ${viewMode === 'toon' ? 'border-white text-white' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
                >
                  TOON Output
                </button>
                <button 
                  onClick={() => setViewMode('json')}
                  className={`h-full flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest transition-colors border-b-2 ${viewMode === 'json' ? 'border-white text-white' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
                >
                  Raw JSON
                </button>
                <button 
                  onClick={() => setViewMode('visual')}
                  className={`h-full flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest transition-colors border-b-2 ${viewMode === 'visual' ? 'border-white text-white' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
                >
                  Structure Map
                </button>
             </div>

             {/* Export Controls */}
             {status === 'success' && (
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest hidden sm:inline mr-2">Export ::</span>
                    <button 
                      onClick={() => handleExport('toon')}
                      className="text-[9px] font-mono text-zinc-500 hover:text-white border border-zinc-800 hover:border-zinc-500 bg-zinc-900/50 px-2 py-1 rounded transition-colors uppercase"
                    >
                      .TOON
                    </button>
                    <button 
                      onClick={() => handleExport('json')}
                      className="text-[9px] font-mono text-zinc-500 hover:text-white border border-zinc-800 hover:border-zinc-500 bg-zinc-900/50 px-2 py-1 rounded transition-colors uppercase"
                    >
                      .JSON
                    </button>
                    <button 
                      onClick={() => handleExport('md')}
                      className="text-[9px] font-mono text-zinc-500 hover:text-white border border-zinc-800 hover:border-zinc-500 bg-zinc-900/50 px-2 py-1 rounded transition-colors uppercase"
                    >
                      .MD
                    </button>
                     <button 
                      onClick={() => handleExport('txt')}
                      className="text-[9px] font-mono text-zinc-500 hover:text-white border border-zinc-800 hover:border-zinc-500 bg-zinc-900/50 px-2 py-1 rounded transition-colors uppercase"
                    >
                      .TXT
                    </button>
                </div>
             )}
          </div>

          {/* Content Area */}
          <div className="flex-grow overflow-hidden relative">
             {!stats && (
               <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 pointer-events-none select-none">
                  <div className="w-24 h-24 border border-zinc-800 flex items-center justify-center mb-4">
                     <div className="w-2 h-2 bg-zinc-600"></div>
                  </div>
                  <p className="font-mono text-xs text-zinc-500 uppercase tracking-[0.3em]">Awaiting Data Stream</p>
               </div>
             )}
             
             {stats && (
               <div className="absolute inset-0">
                 {viewMode === 'toon' && (
                   <CodeBlock 
                     code={toonString} 
                     label="optimized_payload.toon" 
                     stats={{ tokens: stats.estimatedTokensToon, chars: stats.toonChars }} 
                   />
                 )}
                 {viewMode === 'json' && (
                   <CodeBlock 
                     code={jsonString} 
                     label="source_data.json" 
                     stats={{ tokens: stats.estimatedTokensJson, chars: stats.jsonChars }} 
                   />
                 )}
                 {viewMode === 'visual' && (
                   <div className="h-full bg-[#050505] custom-scrollbar">
                     <ToonPreview data={jsonData} />
                   </div>
                 )}
               </div>
             )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;