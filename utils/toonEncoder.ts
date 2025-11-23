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
  const jsonChars = jsonStr.length;
  const toonChars = toonStr.length;
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

// --- Decoder Implementation ---

function parseValue(val: string): any {
  val = val.trim();
  if (val === 'null') return null;
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (!isNaN(Number(val)) && val !== '') return Number(val);
  if (val.startsWith('"') && val.endsWith('"')) {
    return val.slice(1, -1).replace(/""/g, '"');
  }
  return val;
}

function parseCSV(str: string): any[] {
  const result: any[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '"') {
      if (inQuotes && str[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(parseValue(current));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(parseValue(current));
  return result;
}

export class ToonDecoder {
  root: any = null;
  // Stack to track nesting: container, key in parent, type, current indent
  stack: { container: any; key?: string; type: 'object' | 'array' | 'table'; indent: number; headers?: string[] }[] = [];

  constructor() {}

  decode(toonStr: string): any {
    const lines = toonStr.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        this.processLine(line);
    }
    return this.root;
  }

  private processLine(line: string) {
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;
    const content = line.trim();

    // Manage Stack nesting based on indentation
    while (this.stack.length > 0) {
        const top = this.stack[this.stack.length - 1];
        if (indent <= top.indent) {
            this.stack.pop();
        } else {
            break;
        }
    }

    // Regex Patterns
    const tableStart = content.match(/^(?:(\w+)\[\d+\]|table\[\d+\])\{(.+)\}:$/);
    const arrayStart = content.match(/^(?:(\w+)\[\d+\]|\[\d+\]):\s*(.*)$/);
    const keyVal = content.match(/^(\w+):(?:\s*(.*))?$/);
    
    // 1. Table Start (Root or Nested)
    if (tableStart) {
        const isRoot = content.startsWith('table');
        const key = isRoot ? undefined : content.split('[')[0];
        const headers = tableStart[2].split(',');
        const newTable: any[] = [];

        if (isRoot) {
            this.root = newTable;
        } else {
            this.addToCurrent(key!, newTable);
        }
        this.stack.push({ container: newTable, type: 'table', indent, headers });
        return;
    }

    // 2. Array Start (Primitive)
    if (arrayStart) {
        const isRoot = content.startsWith('[');
        const key = isRoot ? undefined : content.split('[')[0];
        const values = arrayStart[2] ? parseCSV(arrayStart[2]) : [];

        if (isRoot) {
            this.root = values;
        } else {
            this.addToCurrent(key!, values);
        }
        return;
    }

    // 3. Key-Value or Object Start
    if (keyVal && !content.startsWith('-')) {
        const key = keyVal[1];
        const valStr = keyVal[2];

        if (!valStr) {
            // Object Start
            const newObj = {};
            // Handle root object case (implicit root)
            if (this.stack.length === 0) {
                if (!this.root) this.root = {}; 
                if (this.root && !Array.isArray(this.root)) {
                    // Root is the object
                }
            }
            this.addToCurrent(key, newObj);
            this.stack.push({ container: newObj, type: 'object', indent, key });
        } else {
            // Primitive Value
            const val = parseValue(valStr);
            if (this.stack.length === 0) {
                 if (!this.root) this.root = {};
                 this.root[key] = val;
            } else {
                this.addToCurrent(key, val);
            }
        }
        return;
    }

    // 4. Table Row
    if (this.stack.length > 0 && this.stack[this.stack.length - 1].type === 'table') {
        const ctx = this.stack[this.stack.length - 1];
        const values = parseCSV(content);
        const row: any = {};
        ctx.headers?.forEach((h, idx) => {
            row[h] = idx < values.length ? values[idx] : null;
        });
        ctx.container.push(row);
        return;
    }

    // 5. List Item (Simple support)
    if (content.startsWith('- ')) {
      // Lists are complex in TOON mixed mode, simplistic handling:
      // If we are in an object and see a list item, it might be a list property?
      // Not fully implemented for complex mixed lists in this basic decoder.
      // But primitive lists are handled via [N]: syntax by encoder.
    }
  }

  private addToCurrent(key: string, val: any) {
    if (this.stack.length === 0) {
        if (this.root && !Array.isArray(this.root)) {
            this.root[key] = val;
        }
    } else {
        const parent = this.stack[this.stack.length - 1];
        if (parent.type === 'object') {
            parent.container[key] = val;
        }
    }
  }
}

export function decodeToon(str: string): any {
    return new ToonDecoder().decode(str);
}