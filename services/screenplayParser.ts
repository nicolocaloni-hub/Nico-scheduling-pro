import { DayNight, ElementCategory, IntExt } from '../types.ts';

export interface ScriptLine {
  text: string;
  page: number;
  /** Coordinates in PDF points, measured from the top left. */
  x: number;
  top: number;
  height: number;
  pageHeight: number;
}

export interface ScriptTextItem { text: string; x: number; top: number; height: number }

export function groupScriptLines(items: ScriptTextItem[], page: number, pageHeight: number): ScriptLine[] {
  const rows: ScriptTextItem[][] = [];
  for (const item of [...items].sort((a, b) => a.top - b.top || a.x - b.x)) {
    if (!item.text.trim()) continue;
    const row = rows.at(-1);
    if (row && Math.abs(row[0].top - item.top) < Math.max(2, Math.min(row[0].height, item.height) * .35)) row.push(item);
    else rows.push([item]);
  }
  return rows.map(row => {
    row.sort((a, b) => a.x - b.x);
    return { text: row.map(i => i.text.trim()).join(' '), page, x: row[0].x,
      top: row[0].top, height: Math.max(...row.map(i => i.height)), pageHeight };
  });
}

const clean = (s: string) => s.normalize('NFKC').replace(/[\u00ad\u200b]/g, '').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
const fold = (s: string) => clean(s).toLocaleUpperCase('it');
const numberPattern = '[A-Z]?\\d+[A-Z]?(?:[.-]\\d+)?';
const marker = '(?:INT(?:ERNO)?|EXT(?:ERNO)?|EST(?:ERNO)?)';
const headerPattern = new RegExp(`^(?:(?:SCENA|SCENE)\\s+)?(?:(${numberPattern})[.)]?\\s+)?(${marker}\\.?\\s*(?:[/\\-]\\s*${marker}\\.?)?|I\\s*[/]\\s*E\\.?)(?:\\s+|(?<=[.]))(.+)$`, 'i');
const continuation = /\s*\(?\b(?:CONTINUED|CONTINUA|SEGUE|CONT['’]?D)\b\)?\s*:?\s*$/i;
const transition = /^(?:\(?MORE\)?|\(?CONTINUA\)?|\(?SEGUE\)?|CUT TO|FADE (?:IN|OUT|TO BLACK)|DISSOLVE TO|SMASH CUT TO|MATCH CUT TO|STACCO|DISSOLVENZA.*|FINE|THE END|FLASHBACK|FINE FLASHBACK|MONTAGGIO|MONTAGE|BACK TO SCENE|TITOLO|TITLE|SUPER|INSERT|DETTAGLIO)\s*[:.!]?$/i;
const actionVerb = /\b(?:entra|esce|prende|guarda|cammina|corre|apre|chiude|sorride|siede|si alza|indossa|afferra|vediamo|vedono|appare|sente|enters|exits|takes|looks|walks|runs|opens|closes|smiles|sits|wears|grabs|we see)\b/i;

export function parseScreenplayHeader(text: string) {
  const normalized = clean(text).replace(/^\*+\s*|\s*\*+$/g, '');
  const match = normalized.match(headerPattern);
  if (!match) return null;
  let [, number, setting, rest] = match;
  // Production PDFs often print the same scene number in both margins.
  if (number) rest = rest.replace(new RegExp(`\\s+${number.replace(/[.]/g, '\\.')}\\s*$`, 'i'), '');
  const continued = continuation.test(rest);
  rest = rest.replace(continuation, '').trim();
  const time = rest.match(/(?:\s+-\s*|\s+)(GIORNO|NOTTE|ALBA|TRAMONTO|MATTINA|POMERIGGIO|SERA|DAY|NIGHT|DAWN|DUSK|MORNING|AFTERNOON|EVENING|SUNRISE|SUNSET|CONTINUOUS|CONTINUO|LATER|PIÙ TARDI|SAME TIME)(?:\s*\([^)]*\))?\s*$/i);
  const timeName = time?.[1].toUpperCase();
  const location = clean(time ? rest.slice(0, time.index) : rest).replace(/[-\s]+$/, '');
  if (!location) return null;
  const both = /[/\-]/.test(setting);
  const intExt = both ? IntExt.INT_EXT : /^INT/i.test(setting) ? IntExt.INT : IntExt.EXT;
  const dayNight = /^(NOTTE|SERA|NIGHT|EVENING)$/.test(timeName || '') ? DayNight.NIGHT
    : /^(ALBA|DAWN|SUNRISE)$/.test(timeName || '') ? DayNight.DAWN
    : /^(TRAMONTO|DUSK|SUNSET)$/.test(timeName || '') ? DayNight.DUSK : DayNight.DAY;
  const knownTime = !!timeName && !/^(CONTINU|LATER|PIÙ|SAME)/.test(timeName);
  return { number: number?.toUpperCase(), slugline: normalized, intExt, dayNight,
    setName: location, locationName: location, continued, knownTime };
}

// Explicit, editable vocabulary: no model, remote request, or semantic inference.
// Match only action descriptions, not objects merely mentioned in dialogue.
const vocabulary: [ElementCategory, string, string][] = [
  [ElementCategory.Props, 'Telefono', 'telefono|telefoni|cellulare|cellulari|smartphone|phone|phones|cell phone'],
  [ElementCategory.Props, 'Pistola', 'pistola|pistole|revolver|pistol|pistols|handgun|gun'],
  [ElementCategory.Props, 'Fucile', 'fucile|fucili|rifle|shotgun'],
  [ElementCategory.Props, 'Coltello', 'coltello|coltelli|knife|knives'],
  [ElementCategory.Props, 'Chiavi', 'chiave|chiavi|key|keys'],
  [ElementCategory.Props, 'Borsa', 'borsa|borse|handbag|bag'],
  [ElementCategory.Props, 'Zaino', 'zaino|zaini|backpack'],
  [ElementCategory.Props, 'Valigia', 'valigia|valigie|suitcase'],
  [ElementCategory.Props, 'Lettera', 'lettera|lettere|letter|letters'],
  [ElementCategory.Props, 'Libro', 'libro|libri|book|books'],
  [ElementCategory.Props, 'Fotografia', 'fotografia|fotografie|photograph|photo'],
  [ElementCategory.Props, 'Computer', 'computer|laptop|portatile'],
  [ElementCategory.Props, 'Bicchiere', 'bicchiere|bicchieri|drinking glass'],
  [ElementCategory.Props, 'Bottiglia', 'bottiglia|bottiglie|bottle|bottles'],
  [ElementCategory.Props, 'Tazza', 'tazza|tazze|cup|mug'],
  [ElementCategory.Props, 'Sigaretta', 'sigaretta|sigarette|cigarette|cigarettes'],
  [ElementCategory.Props, 'Accendino', 'accendino|accendini|lighter'],
  [ElementCategory.Props, 'Scatola', 'scatola|scatole|scatolone|scatoloni|box|boxes'],
  [ElementCategory.Props, 'Orologio', 'orologio|orologi|watch|clock'],
  [ElementCategory.Props, 'Occhiali', 'occhiali|sunglasses|eyeglasses'],
  [ElementCategory.Props, 'Tavolo', 'tavolo|tavoli|table|tables'],
  [ElementCategory.Props, 'Sedia', 'sedia|sedie|chair|chairs'],
  [ElementCategory.Props, 'Letto', 'letto|letti|bed|beds'],
  [ElementCategory.Props, 'Divano', 'divano|divani|sofa|couch'],
  [ElementCategory.Props, 'Lampada', 'lampada|lampade|lamp|lamps'],
  [ElementCategory.Props, 'Specchio', 'specchio|specchi|mirror'],
  [ElementCategory.Props, 'Denaro', 'banconota|banconote|monete|contanti|banknotes|cash|coins'],
  [ElementCategory.Props, 'Corda', 'corda|corde|rope'],
  [ElementCategory.Props, 'Torcia', 'torcia|torce|flashlight'],
  [ElementCategory.Vehicles, 'Automobile', 'auto|automobile|automobili|macchina|macchine|car|cars'],
  [ElementCategory.Vehicles, 'Motocicletta', 'moto|motocicletta|motorcycle|motorbike'],
  [ElementCategory.Vehicles, 'Bicicletta', 'bicicletta|biciclette|bicycle|bike'],
  [ElementCategory.Vehicles, 'Furgone', 'furgone|furgoni|van'],
  [ElementCategory.Vehicles, 'Autobus', 'autobus|bus|pullman'],
  [ElementCategory.Vehicles, 'Camion', 'camion|truck|trucks'],
  [ElementCategory.Vehicles, 'Taxi', 'taxi|cab'],
  [ElementCategory.Vehicles, 'Treno', 'treno|treni|train|trains'],
  [ElementCategory.Vehicles, 'Barca', 'barca|barche|boat|boats'],
  [ElementCategory.Vehicles, 'Ambulanza', 'ambulanza|ambulance'],
  [ElementCategory.Animals, 'Cane', 'cane|cani|dog|dogs'],
  [ElementCategory.Animals, 'Gatto', 'gatto|gatti|cat|cats'],
  [ElementCategory.Animals, 'Cavallo', 'cavallo|cavalli|horse|horses'],
  [ElementCategory.Animals, 'Uccelli', 'uccello|uccelli|piccione|piccioni|bird|birds|pigeon'],
  [ElementCategory.Wardrobe, 'Giacca', 'giacca|giacche|jacket|jackets'],
  [ElementCategory.Wardrobe, 'Cappotto', 'cappotto|cappotti|coat|coats'],
  [ElementCategory.Wardrobe, 'Cappello', 'cappello|cappelli|hat|hats'],
  [ElementCategory.Wardrobe, 'Uniforme', 'uniforme|uniformi|divisa|divise|uniform|uniforms'],
  [ElementCategory.Wardrobe, 'Camicia', 'camicia|camicie|shirt|shirts'],
  [ElementCategory.Wardrobe, 'Abito da sposa', 'abito da sposa|vestito da sposa|wedding dress'],
  [ElementCategory.Wardrobe, 'Casco', 'casco|caschi|helmet|helmets'],
  [ElementCategory.MakeupHair, 'Sangue', 'sangue|insanguinat[oaie]|blood|bloody'],
  [ElementCategory.MakeupHair, 'Ferita', 'ferita|ferite|livido|lividi|wound|wounds|bruise|bruises'],
  [ElementCategory.MakeupHair, 'Parrucca', 'parrucca|parrucche|wig|wigs'],
  [ElementCategory.SFX, 'Esplosione', 'esplosione|esplosioni|esplode|explosion|explodes'],
  [ElementCategory.SFX, 'Pioggia', 'pioggia|piove|rain|raining'],
  [ElementCategory.SFX, 'Fumo', 'fumo|smoke'],
  [ElementCategory.SFX, 'Fuoco', 'incendio|fiamme|flames|on fire'],
  [ElementCategory.VFX, 'Effetti visivi espliciti', 'vfx|cgi|green screen|schermo verde'],
  [ElementCategory.Background, 'Folla', 'folla|crowd'],
  [ElementCategory.Background, 'Passanti', 'passanti|pedoni|pedestrians|passersby'],
  [ElementCategory.Background, 'Clienti', 'clienti|customers'],
  [ElementCategory.Background, 'Studenti', 'studenti|students'],
  [ElementCategory.Stunt, 'Colluttazione', 'colluttazione|rissa|scazzottata|brawl|fistfight'],
  [ElementCategory.Stunt, 'Inseguimento', 'inseguimento|car chase'],
  [ElementCategory.Sound, 'Sparo', 'sparo|spari|gunshot|gunshots'],
  [ElementCategory.Sound, 'Sirena', 'sirena|sirene|siren|sirens'],
  [ElementCategory.Music, 'Musica', 'musica|canzone|music|song'],
];
const rules = vocabulary.map(([category, name, words]) => ({ category, name,
  pattern: new RegExp(`(?<![\\p{L}\\p{N}])(?:${words})(?![\\p{L}\\p{N}])`, 'iu') }));
const literalPattern = (name: string) => new RegExp(`(?<![\\p{L}\\p{N}])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu');

function isCue(lines: ScriptLine[], index: number, left: number): string | null {
  const line = lines[index];
  const name = line.text.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s*\^$/, '').trim();
  if (!/^[\p{Lu}\d][\p{Lu}\d '’.-]{0,44}$/u.test(name) || name.split(' ').length > 5
    || !/\p{Lu}/u.test(name) || transition.test(name) || actionVerb.test(name) || parseScreenplayHeader(name)) return null;
  let nextIndex = index + 1;
  while (nextIndex < lines.length && /^\(/.test(lines[nextIndex].text)) nextIndex++;
  const next = lines[nextIndex];
  if (!next || transition.test(next.text) || parseScreenplayHeader(next.text)) return null;
  const previous = lines[index - 1];
  const gap = !previous || previous.page !== line.page || line.top - previous.top > line.height * 1.6;
  const indented = line.x - left >= 35 && next.x - left >= 15;
  const plainCue = gap && next.text !== next.text.toUpperCase() && !actionVerb.test(next.text);
  return indented || plainCue ? name : null;
}

export function parseScreenplayLines(input: ScriptLine[]) {
  const warnings = new Set<string>();
  const lines = input.map(l => ({ ...l, text: clean(l.text) })).filter(l => l.text);
  const margins = new Map<string, Set<number>>();
  for (const line of lines) {
    if (line.top < line.pageHeight * .075 || line.top > line.pageHeight * .925) {
      const key = fold(line.text);
      if (!margins.has(key)) margins.set(key, new Set());
      margins.get(key)!.add(line.page);
    }
  }
  const body = lines.filter(l => {
    if (parseScreenplayHeader(l.text)) return true;
    const inMargin = l.top < l.pageHeight * .075 || l.top > l.pageHeight * .925;
    return !(inMargin && (/^(?:PAG(?:INA)?\.?\s*)?\d+[.]?$/i.test(l.text) || (margins.get(fold(l.text))?.size || 0) > 1))
      && !/^\(?MORE\)?$|^\(?CONTINUED\)?:?$|^\(?SEGUE\)?:?$|^\(?CONTINUA\)?:?$/i.test(l.text);
  });
  if (!body.length) throw new Error('Il PDF non contiene testo leggibile. Se è una scansione, usa prima un OCR oppure importa un PDF con testo selezionabile.');
  const blocks: { header: NonNullable<ReturnType<typeof parseScreenplayHeader>>; lines: ScriptLine[] }[] = [];
  for (const line of body) {
    const header = parseScreenplayHeader(line.text);
    const previous = blocks.at(-1);
    if (header && header.continued && previous && (header.number === previous.header.number || !header.number)
      && fold(header.setName) === fold(previous.header.setName)) continue;
    if (header) blocks.push({ header, lines: [line] });
    else if (previous) previous.lines.push(line);
  }
  if (!blocks.length) throw new Error('Nessuna intestazione di scena riconosciuta. Usa intestazioni come «1 INT. CUCINA - GIORNO» o «EXT. STREET - NIGHT». Nessun dato del progetto è stato sostituito.');
  const reserved = new Set(blocks.flatMap(b => b.header.number ? [b.header.number] : []));
  const used = new Set<string>();
  const castByBlock: string[][] = [];
  const actionByBlock: string[][] = [];
  const allCast = new Set<string>();
  for (const block of blocks) {
    const content = block.lines.slice(1);
    const left = Math.min(...block.lines.map(l => l.x));
    const names: string[] = [];
    const actions: string[] = [];
    let dialogue = false;
    for (let i = 0; i < content.length; i++) {
      const line = content[i];
      const cue = isCue(content, i, left);
      if (cue) { names.push(cue); allCast.add(cue); dialogue = true; continue; }
      if (transition.test(line.text)) { dialogue = false; continue; }
      const previous = content[i - 1];
      if (dialogue && previous && !/^\(/.test(line.text) && (
        (line.x < left + 15 && previous.x >= left + 15)
        || (previous.page === line.page && line.top - previous.top > line.height * 1.6)
      )) dialogue = false;
      if (!dialogue && !/^\(/.test(line.text)) {
        actions.push(line.text);
        // Explicit character introductions with an age, e.g. MARIA ROSSI (32).
        for (const match of line.text.matchAll(/(?<![\p{L}])([\p{Lu}][\p{Lu}'’]+(?: [\p{Lu}][\p{Lu}'’]+){0,3})\s*\(\s*\d{1,3}(?:\s*(?:anni|years old))?\s*\)/gu)) {
          names.push(match[1]); allCast.add(match[1]);
        }
      }
    }
    castByBlock.push(names);
    actionByBlock.push(actions);
  }
  if (!allCast.size) warnings.add('Nessun personaggio riconosciuto con certezza: controlla i nomi sopra i dialoghi e aggiungi manualmente quelli mancanti.');
  const elements = new Map<string, { name: string; category: ElementCategory }>();
  const sceneElements: Record<string, string[]> = {};
  let autoNumber = 1;
  const scenes = blocks.map((block, index) => {
    let sceneNumber = block.header.number;
    if (!sceneNumber) {
      while (reserved.has(String(autoNumber)) || used.has(String(autoNumber))) autoNumber++;
      sceneNumber = String(autoNumber++);
    }
    if (used.has(sceneNumber)) {
      const original = sceneNumber;
      let suffix = 2;
      while (used.has(`${original}-${suffix}`) || reserved.has(`${original}-${suffix}`)) suffix++;
      sceneNumber = `${original}-${suffix}`;
      warnings.add(`Numero scena ${original} ripetuto: assegnato ${sceneNumber}. Verifica la numerazione.`);
    }
    used.add(sceneNumber);
    if (!block.header.knownTime) warnings.add(`Scena ${sceneNumber}: orario assente/relativo, GIORNO provvisorio da verificare.`);
    const actions = actionByBlock[index].join(' ');
    const sceneCast = new Set(castByBlock[index]);
    for (const name of allCast) if (literalPattern(name).test(actions)) sceneCast.add(name);
    const found = [...sceneCast].map(name => ({ name, category: ElementCategory.Cast }));
    for (const { name, category, pattern } of rules) {
      if (pattern.test(actions)) found.push({ name, category });
    }
    // Name-only links are the app's existing import contract. Avoid category/name collisions.
    for (const element of found) {
      if (element.category !== ElementCategory.Cast && allCast.has(fold(element.name))) element.name += ` (${element.category})`;
      elements.set(fold(element.name), element);
    }
    sceneElements[sceneNumber] = [...new Set(found.map(e => e.name))];
    const start = block.lines[0];
    const last = block.lines.at(-1)!;
    const next = blocks[index + 1]?.lines[0];
    // Approximate eighths from occupied page height, excluding conventional margins.
    const end = next?.page === last.page ? next : { ...last, top: last.top + last.height * 1.2 };
    const fraction = (l: ScriptLine) => Math.max(0, Math.min(1, (l.top / l.pageHeight - .08) / .84));
    const eighths = Math.max(1, Math.round((end.page - start.page + fraction(end) - fraction(start)) * 8));
    const { number, continued, knownTime, ...header } = block.header;
    const synopsis = actions.match(/^.{1,320}(?:[.!?](?:\s|$)|$)/)?.[0]?.trim() || actions.slice(0, 320);
    return { ...header, sceneNumber, pageCountInEighths: `${Math.floor(eighths / 8)} ${eighths % 8}/8`,
      synopsis, scriptText: block.lines.map(l => l.text).join('\n') };
  });
  return { data: { scenes, elements: [...elements.values()], sceneElements, warnings: [...warnings] },
    summary: { sceneCount: scenes.length, locationCount: new Set(scenes.map(s => fold(s.locationName))).size,
      castCount: [...elements.values()].filter(e => e.category === ElementCategory.Cast).length,
      propsCount: [...elements.values()].filter(e => e.category === ElementCategory.Props).length },
    modelUsed: 'Parser locale · senza AI' };
}
