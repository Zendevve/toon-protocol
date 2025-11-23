function escapeVal(val: any): string {
  if (val === undefined || val === null) return 'null';
  const str = String(val);
  // Quote if contains commas, newlines, colons, or special start chars
  if (str.includes(',') || str.includes('\n') || str.includes(':') || str.includes('"') || str.startsWith('[') || str.startsWith('{')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function isUniformArray(arr: any[]): boolean {
  if (arr.length === 0) return false;
  const first = arr[0];
  if (typeof first !== 'object' || first === null || Array.isArray(first)) return false;
  
  const keys = Object.keys(first);
  if (keys.length === 0) return false;

  return arr.every(item => 
    typeof item === 'object' && 
    item !== null && 
    !Array.isArray(item) &&
    Object.keys(item).length === keys.length &&
    keys.every(k => k in item)
  );
}

export function convertToToon(data: any): string {
  // Helper to recursively encode
  const encode = (curr: any, indent: number, key: string | null): string => {
    const space = '  '.repeat(indent);
    const prefix = key ? `${space}${key}:` : '';
    const contentIndent = key ? '' : space; // Root object case vs nested

    if (curr === null || curr === undefined) {
      return `${prefix} null`;
    }

    if (Array.isArray(curr)) {
      // Case 1: Empty Array
      if (curr.length === 0) return `${prefix} []`;

      // Case 2: Array of Primitives
      if (curr.every(i => typeof i !== 'object')) {
        const header = key ? `${space}${key}[${curr.length}]:` : `${space}[${curr.length}]:`; // Root array handle
        return `${header} ${curr.map(escapeVal).join(',')}`;
      }

      // Case 3: Uniform Object Array (Tabular)
      if (isUniformArray(curr)) {
        const keys = Object.keys(curr[0]);
        const header = key ? `${space}${key}[${curr.length}]{${keys.join(',')}}:` : `${space}table[${curr.length}]{${keys.join(',')}}:`;
        const rows = curr.map(item => 
          `${space}  ${keys.map(k => escapeVal(item[k])).join(',')}`
        ).join('\n');
        return `${header}\n${rows}`;
      }

      // Case 4: Standard List
      const listHeader = key ? `${prefix}` : '';
      const listItems = curr.map(item => {
        if (typeof item === 'object' && item !== null) {
          // Complex object in list - YAML style
          // We render the object with an indent, but formatted as a list item
          // Simplified: Just recurse but treating it as a property of a list item? 
          // No, TOON/YAML lists are "- key: val"
          // For this generic encoder, let's simplify nested objects in mixed lists
          const objStr = encode(item, indent + 1, null).trimStart();
          return `${space}  - ${objStr}`;
        } else {
          return `${space}  - ${escapeVal(item)}`;
        }
      }).join('\n');
      
      return listHeader ? `${listHeader}\n${listItems}` : listItems;
    }

    if (typeof curr === 'object') {
      const entries = Object.entries(curr);
      if (entries.length === 0) return `${prefix} {}`;
      
      const lines = entries.map(([k, v]) => {
         // If value is array or object, it handles its own indentation relative to this level
         if (typeof v === 'object' && v !== null) {
             return encode(v, indent + (key ? 1 : 0), k); 
         }
         return `${space}${key ? '  ' : ''}${k}: ${escapeVal(v)}`;
      }).join('\n');
      
      return key ? `${prefix}\n${lines}` : lines;
    }

    return `${prefix} ${escapeVal(curr)}`;
  };

  return encode(data, 0, null).trim();
}

export function calculateTokenStats(jsonStr: string, toonStr: string) {
  // Rough estimation: 4 chars per token approx, but TOON is dense so structure matters.
  // We will use character count as the primary "size" metric for accuracy in this demo.
  const jsonChars = jsonStr.length;
  const toonChars = toonStr.length;
  // A simple heuristic for tokens (char count / 4 is standard rule of thumb)
  const estJson = Math.ceil(jsonChars / 4);
  const estToon = Math.ceil(toonChars / 4);
  
  return {
    jsonChars,
    toonChars,
    savingsPercent: Math.round(((jsonChars - toonChars) / jsonChars) * 100),
    estimatedTokensJson: estJson,
    estimatedTokensToon: estToon
  };
}
