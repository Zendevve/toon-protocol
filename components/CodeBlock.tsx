import React from 'react';

interface CodeBlockProps {
  code: string;
  label: string;
  stats?: {
    tokens: number;
    chars: number;
  };
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, label, stats }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col border border-zinc-800 bg-black group">
      <div className="flex-none h-10 border-b border-zinc-800 flex items-center justify-between px-3 bg-zinc-900/20">
         <div className="flex items-center gap-3">
           <div className="w-2 h-2 bg-zinc-600"></div>
           <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">{label}</span>
         </div>
         <div className="flex items-center gap-4">
            {stats && (
              <span className="text-[10px] font-mono text-zinc-600 hidden sm:inline-block">
                {stats.tokens.toLocaleString()} TOKENS // {stats.chars.toLocaleString()} CHARS
              </span>
            )}
            <button 
              onClick={handleCopy}
              className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
            >
              {copied ? 'COPIED' : 'COPY'}
            </button>
         </div>
      </div>

      <div className="flex-grow relative overflow-hidden">
        <textarea 
          readOnly 
          value={code} 
          className="absolute inset-0 w-full h-full bg-transparent text-zinc-300 font-mono text-xs p-4 resize-none focus:outline-none selection:bg-zinc-800 selection:text-white leading-relaxed"
          spellCheck={false}
        />
      </div>
    </div>
  );
};