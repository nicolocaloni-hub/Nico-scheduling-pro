import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker src for pdfjs using Vite's URL import
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export interface ParsedCrewMember {
  department: string;
  role: string;
  name: string;
}

export const parseDocumentLocally = async (file: File): Promise<ParsedCrewMember[]> => {
  let text = '';

  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const tables = doc.querySelectorAll('table');
    if (tables.length > 0) {
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.textContent?.trim() || '');
          text += cells.join('\t') + '\n';
        });
      });
    } else {
      const ps = doc.querySelectorAll('p');
      ps.forEach(p => {
        text += p.textContent?.trim() + '\n';
      });
    }
  } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    // We will try to find the X coordinates of the columns dynamically
    let activeColumns: { id: string, x: number }[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const items = textContent.items as any[];
      
      // Find headers to establish column X coordinates for this page
      let pageColumns: { id: string, x: number }[] = [];
      for (const item of items) {
        const str = item.str.trim().toUpperCase();
        if (str === 'REPARTI' || str === 'REPARTI TROUPE' || str === 'ATTORI') pageColumns.push({ id: 'reparti', x: item.transform[4] });
        if (str === 'NOME') pageColumns.push({ id: 'nome', x: item.transform[4] });
        if (str === 'RUOLO') pageColumns.push({ id: 'ruolo', x: item.transform[4] });
        if (str === 'NUMERO' || str === 'TELEFONO') pageColumns.push({ id: 'numero', x: item.transform[4] });
        if (str === 'INTOLLERANZE' || str === 'NOTE') pageColumns.push({ id: 'intolleranze', x: item.transform[4] });
      }

      // If we found headers on this page, update active columns
      if (pageColumns.length > 0) {
        // Ensure we have at least reparti, nome, ruolo if they weren't explicitly found but we have some columns
        if (!pageColumns.find(c => c.id === 'reparti')) pageColumns.push({ id: 'reparti', x: 0 });
        if (!pageColumns.find(c => c.id === 'nome') && pageColumns.length > 0) {
           // Estimate nome position
           const repartiCol = pageColumns.find(c => c.id === 'reparti');
           if (repartiCol) pageColumns.push({ id: 'nome', x: repartiCol.x + 150 });
        }
        if (!pageColumns.find(c => c.id === 'ruolo') && pageColumns.length > 0) {
           // Estimate ruolo position
           const nomeCol = pageColumns.find(c => c.id === 'nome');
           if (nomeCol) pageColumns.push({ id: 'ruolo', x: nomeCol.x + 150 });
        }
        activeColumns = pageColumns;
      }

      // If we still don't have active columns, use defaults
      if (activeColumns.length === 0) {
        activeColumns = [
          { id: 'reparti', x: 0 },
          { id: 'nome', x: 150 },
          { id: 'ruolo', x: 300 }
        ];
      }

      // Group by Y
      items.sort((a, b) => {
        if (Math.abs(b.transform[5] - a.transform[5]) > 5) {
          return b.transform[5] - a.transform[5];
        }
        return a.transform[4] - b.transform[4];
      });

      let lastY = -1;
      let rowItems: any[] = [];
      const rows: any[][] = [];
      
      for (const item of items) {
        if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
          rows.push(rowItems);
          rowItems = [];
        }
        rowItems.push(item);
        lastY = item.transform[5];
      }
      if (rowItems.length > 0) rows.push(rowItems);

      for (const row of rows) {
        let repartiStr = '';
        let nomeStr = '';
        let ruoloStr = '';
        
        for (const item of row) {
          const x = item.transform[4];
          const str = item.str.trim();
          if (!str) continue;
          
          // Sort columns by X coordinate to define boundaries
          const sortedCols = [...activeColumns].sort((a, b) => a.x - b.x);
          
          let assignedCol = sortedCols[0].id; // Default to first column
          
          for (let i = 0; i < sortedCols.length; i++) {
            const currentCol = sortedCols[i];
            const nextCol = sortedCols[i + 1];
            
            // If we are past the current column's start X
            if (x >= currentCol.x - 20) { // 20px tolerance for left alignment
              // If there is no next column, or we are before the next column's start X
              if (!nextCol || x < nextCol.x - 20) {
                assignedCol = currentCol.id;
                break;
              }
            }
          }
          
          if (assignedCol === 'reparti') repartiStr += (repartiStr ? ' ' : '') + str;
          if (assignedCol === 'nome') nomeStr += (nomeStr ? ' ' : '') + str;
          if (assignedCol === 'ruolo') ruoloStr += (ruoloStr ? ' ' : '') + str;
        }
        
        if (repartiStr || nomeStr || ruoloStr) {
          fullText += `${repartiStr}\t${nomeStr}\t${ruoloStr}\n`;
        }
      }
    }
    text = fullText;
  } else {
    throw new Error('Formato file non supportato. Usa PDF o DOCX.');
  }

  return extractCrewFromText(text);
};

const extractCrewFromText = (text: string): ParsedCrewMember[] => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const crew: ParsedCrewMember[] = [];
  
  let currentDepartment = '';
  let isParsingTable = false;

  const knownDepartments = [
    'PRODUZIONE', 'REGIA', 'FOTOGRAFIA', 'ELETTRICISMO', 'MACCHINISMO', 
    'AUDIO', 'MONTAGGIO', 'SCENOGRAFIA', 'COSTUMI', 'TRUCCO', 'PARRUCCO', 
    'FOTO DI SCENA', 'ATTORI', 'CAST'
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();

    // Start parsing when we see headers
    if (upperLine.includes('REPARTI') || upperLine.includes('NOME') || upperLine.includes('RUOLO')) {
      isParsingTable = true;
      continue;
    }

    if (!isParsingTable) {
      if (knownDepartments.some(d => upperLine === d || upperLine.startsWith(d))) {
        isParsingTable = true;
      } else {
        continue;
      }
    }

    // Check if line is a department
    const isKnownDept = knownDepartments.some(d => upperLine === d || upperLine.startsWith(d));
    if (isKnownDept || (upperLine === line && line.length > 3 && line.split(' ').length <= 2 && !/\d/.test(line))) {
      currentDepartment = line;
      continue;
    }

    // Split by tabs, DO NOT filter empty columns so we know which is which
    const cols = line.split('\t').map(c => c.trim());
    
    if (cols.every(c => c.length === 0)) continue;

    let name = '';
    let role = '';

    // With the new PDF extraction, we always output: reparti \t nome \t ruolo
    if (cols.length >= 3) {
      const repartiCol = cols[0];
      if (repartiCol && knownDepartments.some(d => repartiCol.toUpperCase().startsWith(d))) {
        currentDepartment = repartiCol;
      } else if (repartiCol && !cols[1] && !cols[2]) {
        // If only first column is present, it might be a department
        currentDepartment = repartiCol;
        continue;
      }
      
      name = cols[1];
      role = cols[2];
    } else {
      // Fallback for DOCX or other formats
      const nonEmptyCols = cols.filter(c => c.length > 0);
      if (nonEmptyCols.length >= 2) {
        name = nonEmptyCols[0];
        role = nonEmptyCols[1];
        if (knownDepartments.includes(name.toUpperCase())) {
          currentDepartment = name;
          name = nonEmptyCols[1];
          role = nonEmptyCols[2] || '';
        }
      } else if (nonEmptyCols.length === 1) {
        const words = nonEmptyCols[0].split(/\s+/);
        if (words.length >= 2 && !/\d/.test(nonEmptyCols[0])) {
          name = words.slice(0, 2).join(' ');
          role = words.slice(2).join(' ');
        } else {
          name = nonEmptyCols[0];
        }
      }
    }

    // Clean up name and role
    name = name.replace(/(?:\+39)?\s*\d{3}\s*\d{3}\s*\d{4}/g, '').replace(/\+?\d{9,12}/g, '').trim();
    role = role.replace(/(?:\+39)?\s*\d{3}\s*\d{3}\s*\d{4}/g, '').replace(/\+?\d{9,12}/g, '').trim();

    // Remove common notes from role
    const noteKeywords = ['NO -', 'NO-', 'VEGANA', 'LATTOSIO', 'INTOLLERANZA', 'ALLERGIA', 'PESCE', 'CARNE', 'CROSTACEI'];
    for (const kw of noteKeywords) {
      const idx = role.toUpperCase().indexOf(kw);
      if (idx !== -1) {
        role = role.substring(0, idx).trim();
      }
      const idxName = name.toUpperCase().indexOf(kw);
      if (idxName !== -1) {
        name = name.substring(0, idxName).trim();
      }
    }

    // If both are empty after cleaning, skip
    if (!name && !role) continue;

    // If name is empty but role is not, or vice versa, we still push it so the post-processor can merge it
    if ((name && name.length > 2 && !knownDepartments.includes(name.toUpperCase())) || (!name && role)) {
      crew.push({
        department: currentDepartment || 'Generico',
        name: name,
        role: role || (name ? 'Membro Troupe' : '')
      });
    }
  }

  // Post-process to merge continuations (e.g. "Ass." and "Produzione" on next line)
  const mergedCrew: ParsedCrewMember[] = [];
  for (let i = 0; i < crew.length; i++) {
    const current = crew[i];
    if (i > 0) {
      const prev = mergedCrew[mergedCrew.length - 1];
      
      // If current name is empty but role is not, it's a role continuation
      if (!current.name && current.role) {
        prev.role += (prev.role ? ' ' : '') + current.role;
        continue;
      }
      
      // If current role is empty but name is not, it might be a name continuation
      if (!current.role && current.name) {
        // If previous name was just one word, maybe this is the surname
        if (prev.name.split(' ').length === 1 && current.name.split(' ').length === 1) {
          prev.name += ' ' + current.name;
          continue;
        }
      }
    }
    
    // Only push if we actually have a name
    if (current.name) {
      // If role is still empty, give it a default
      if (!current.role) current.role = 'Membro Troupe';
      mergedCrew.push(current);
    }
  }

  return mergedCrew;
};
