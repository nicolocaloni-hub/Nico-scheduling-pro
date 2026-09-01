export interface ParsedCrewMember {
  department: string;
  role: string;
  name: string;
}

export interface PositionedText {
  text: string;
  x: number;
  y: number;
  height?: number;
}

interface ColumnLayout {
  departmentX: number;
  nameX: number;
  roleX: number;
  trailingX?: number;
  contactX?: number;
  detailsX?: number;
}

interface ParsedLine {
  department: string;
  name: string;
  role: string;
  contact: string;
  details: string;
}

const HEADER_PATTERNS = {
  department: /^(?:REPARTI?(?:\s+(?:TROUPE|TECNICI))?|DIPARTIMENT[OI])$/,
  name: /^(?:NOME(?:\s+(?:E\s+)?COGNOME)?|NOMINATIVO)$/,
  role: /^(?:RUOLO|QUALIFICA|MANSIONE)$/,
  contact: /^(?:NUMERO|TELEFONO|CELLULARE|CONTATTO|TEL\.?|MOBILE)$/,
  details: /^(?:INTOLLERANZ[AE]|NOTE|LOGISTICA|E-?MAIL)$/,
};

const CREW_HEADER_CONTINUATIONS = new Set(['TROUPE', 'TECNICI']);
const NON_CREW_SECTION = /^(?:ATTORI|CAST|INTERPRETI)(?:\s|$)/;

const normalizeLabel = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toUpperCase();

const cleanCell = (value: string) => value
  .replace(/[\u0000-\u001f\u007f]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const appendCell = (base: string, continuation: string) => {
  const left = cleanCell(base);
  const right = cleanCell(continuation);
  if (!left) return right;
  if (!right) return left;

  if (left.endsWith('-')) {
    return `${left.slice(0, -1)}${right}`;
  }

  const joined = `${left} ${right}`;
  return joined.replace(/(\/\p{L}{3,})\s+(\p{Ll}{1,4})(?=\s|$)/gu, '$1$2');
};

const matchesHeader = (value: string, pattern: RegExp) => pattern.test(normalizeLabel(value));

const findColumnLayout = (items: PositionedText[]): ColumnLayout | null => {
  const nonCrewMarkers = items.filter(item => NON_CREW_SECTION.test(normalizeLabel(item.text)));
  const names = items
    .filter(item => matchesHeader(item.text, HEADER_PATTERNS.name))
    .sort((a, b) => b.y - a.y);
  const header = names.map(name => {
    const role = items
      .filter(item => (
        item.x > name.x
        && Math.abs(item.y - name.y) <= 3
        && matchesHeader(item.text, HEADER_PATTERNS.role)
      ))
      .sort((a, b) => a.x - b.x)[0];
    return role ? { name, role } : null;
  }).find(candidate => (
    candidate
    && !nonCrewMarkers.some(marker => marker.y > candidate.name.y + 3)
  ));

  if (!header) return null;

  const { name, role } = header;
  const department = items
    .filter(item => (
      item.x < name.x
      && Math.abs(item.y - name.y) <= 3
      && matchesHeader(item.text, HEADER_PATTERNS.department)
    ))
    .sort((a, b) => b.x - a.x)[0];
  const trailing = items
    .filter(item => item.x > role.x && Math.abs(item.y - role.y) <= 3)
    .sort((a, b) => a.x - b.x)[0];

  const contact = items
    .filter(item => (
      item.x > role.x
      && Math.abs(item.y - role.y) <= 3
      && matchesHeader(item.text, HEADER_PATTERNS.contact)
    ))
    .sort((a, b) => a.x - b.x)[0];
  const details = items
    .filter(item => (
      item.x > role.x
      && Math.abs(item.y - role.y) <= 3
      && matchesHeader(item.text, HEADER_PATTERNS.details)
    ))
    .sort((a, b) => a.x - b.x)[0];

  const estimatedDepartmentX = Math.max(0, name.x - (role.x - name.x));

  return {
    departmentX: department?.x ?? estimatedDepartmentX,
    nameX: name.x,
    roleX: role.x,
    trailingX: trailing?.x,
    contactX: contact?.x,
    detailsX: details?.x,
  };
};

const groupIntoLines = (items: PositionedText[]): PositionedText[][] => {
  const sorted = items
    .filter(item => cleanCell(item.text).length > 0)
    .sort((a, b) => Math.abs(b.y - a.y) > 3 ? b.y - a.y : a.x - b.x);
  const lines: PositionedText[][] = [];

  for (const item of sorted) {
    const current = lines[lines.length - 1];
    if (!current || Math.abs(current[0].y - item.y) > 3) {
      lines.push([item]);
    } else {
      current.push(item);
      current.sort((a, b) => a.x - b.x);
    }
  }

  return lines;
};

const lineToCells = (items: PositionedText[], columns: ColumnLayout): ParsedLine => {
  const cells: ParsedLine = { department: '', name: '', role: '', contact: '', details: '' };
  const departmentEnd = (columns.departmentX + columns.nameX) / 2;
  const nameEnd = (columns.nameX + columns.roleX) / 2;
  const firstTrailingX = columns.trailingX ?? columns.contactX ?? columns.detailsX;
  const roleEnd = firstTrailingX === undefined
    ? Number.POSITIVE_INFINITY
    : (columns.roleX + firstTrailingX) / 2;
  const contactEnd = columns.contactX !== undefined && columns.detailsX !== undefined
    ? (columns.contactX + columns.detailsX) / 2
    : Number.POSITIVE_INFINITY;

  for (const item of [...items].sort((a, b) => a.x - b.x)) {
    const value = cleanCell(item.text);
    if (!value) continue;

    if (item.x < departmentEnd) {
      cells.department = appendCell(cells.department, value);
    } else if (item.x < nameEnd) {
      cells.name = appendCell(cells.name, value);
    } else if (item.x < roleEnd) {
      cells.role = appendCell(cells.role, value);
    } else if (columns.contactX !== undefined && item.x < contactEnd) {
      cells.contact = appendCell(cells.contact, value);
    } else if (columns.detailsX !== undefined) {
      cells.details = appendCell(cells.details, value);
    } else {
      cells.contact = appendCell(cells.contact, value);
    }
  }

  return cells;
};

const isHeaderLine = (line: ParsedLine) => (
  matchesHeader(line.name, HEADER_PATTERNS.name)
  || matchesHeader(line.role, HEADER_PATTERNS.role)
  || matchesHeader(line.contact, HEADER_PATTERNS.contact)
  || matchesHeader(line.details, HEADER_PATTERNS.details)
);

const isUsableName = (name: string) => /\p{L}/u.test(name) && !/^[-–—]+$/.test(name);

/**
 * Parses crew tables from positioned PDF text. Values are deliberately not matched
 * against known departments or roles: only the table headers and column geometry
 * determine what is imported.
 */
export const extractCrewFromPositionedPages = (pages: PositionedText[][]): ParsedCrewMember[] => {
  const crew: ParsedCrewMember[] = [];
  let columns: ColumnLayout | null = null;
  let currentDepartment = '';
  let currentMember: ParsedCrewMember | null = null;
  let isInsideCrewTable = false;
  let reachedNonCrewSection = false;
  let currentMemberLine: { pageIndex: number; y: number; height: number } | null = null;

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const pageItems = pages[pageIndex];
    if (reachedNonCrewSection) break;

    columns = findColumnLayout(pageItems) ?? columns;
    if (!columns) continue;

    for (const positionedLine of groupIntoLines(pageItems)) {
      const rawLineLabel = normalizeLabel(
        positionedLine.map(item => item.text).join(' ')
      );
      if (NON_CREW_SECTION.test(rawLineLabel)) {
        reachedNonCrewSection = true;
        break;
      }

      const line = lineToCells(positionedLine, columns);
      const departmentLabel = normalizeLabel(line.department);
      const linePosition = {
        pageIndex,
        y: positionedLine[0].y,
        height: Math.max(...positionedLine.map(item => item.height || 10)),
      };

      if (NON_CREW_SECTION.test(departmentLabel)) {
        reachedNonCrewSection = true;
        break;
      }

      if (isHeaderLine(line)) {
        isInsideCrewTable = true;
        currentMember = null;
        currentMemberLine = null;
        continue;
      }

      if (!isInsideCrewTable) continue;

      if (
        CREW_HEADER_CONTINUATIONS.has(departmentLabel)
        && !line.name
        && !line.role
        && !line.contact
        && !line.details
      ) {
        continue;
      }

      if (line.department && !line.name && !line.role && !line.contact && !line.details) {
        currentDepartment = cleanCell(line.department);
        currentMember = null;
        currentMemberLine = null;
        continue;
      }

      const isAdjacentToCurrent = Boolean(
        currentMemberLine
        && currentMemberLine.pageIndex === pageIndex
        && Math.abs(currentMemberLine.y - linePosition.y) <= Math.max(
          4,
          Math.max(currentMemberLine.height, linePosition.height) * 1.6
        )
      );

      if (line.name && line.role) {
        if (currentMember && isAdjacentToCurrent && !line.contact && !line.details) {
          currentMember.name = appendCell(currentMember.name, line.name);
          currentMember.role = appendCell(currentMember.role, line.role);
          currentMemberLine = linePosition;
          continue;
        }

        currentMember = {
          department: currentDepartment,
          name: cleanCell(line.name),
          role: cleanCell(line.role),
        };
        crew.push(currentMember);
        currentMemberLine = linePosition;
        continue;
      }

      if (line.name) {
        if (currentMember && isAdjacentToCurrent) {
          currentMember.name = appendCell(currentMember.name, line.name);
        } else {
          currentMember = {
            department: currentDepartment,
            name: cleanCell(line.name),
            role: cleanCell(line.role),
          };
          crew.push(currentMember);
        }
        currentMemberLine = linePosition;
      }

      if (line.role && currentMember) {
        if (isAdjacentToCurrent) {
          currentMember.role = appendCell(currentMember.role, line.role);
          currentMemberLine = linePosition;
        } else {
          currentMember = null;
          currentMemberLine = null;
        }
      }
    }
  }

  const unique = new Map<string, ParsedCrewMember>();
  for (const member of crew) {
    const cleaned = {
      department: cleanCell(member.department),
      name: cleanCell(member.name),
      role: cleanCell(member.role),
    };
    if (!isUsableName(cleaned.name) || !cleaned.role) continue;

    const key = [cleaned.department, cleaned.role, cleaned.name]
      .map(normalizeLabel)
      .join('|');
    if (!unique.has(key)) unique.set(key, cleaned);
  }

  return [...unique.values()];
};

