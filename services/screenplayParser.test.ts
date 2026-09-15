import test from 'node:test';
import assert from 'node:assert/strict';
import { groupScriptLines, parseScreenplayHeader, parseScreenplayLines, type ScriptLine } from './screenplayParser.ts';
import { DayNight, ElementCategory, IntExt } from '../types.ts';

function page(text: string, number = 1): ScriptLine[] {
  return text.split('\n').map((text, i) => ({ text: text.trim(), x: text.startsWith('    ') ? 210 : text.startsWith('  ') ? 140 : 72,
    page: number, top: 80 + i * 14, height: 12, pageHeight: 842 }));
}

test('Italian/English headings, mixed markers, suffixes and mirrored numbers', () => {
  for (const marker of ['EXT.', 'EST.', 'ESTERNO', 'EXT']) assert.equal(parseScreenplayHeader(`12A ${marker} PARCO - NOTTE 12A`)?.intExt, IntExt.EXT);
  for (const marker of ['INT./EXT.', 'INT/EST', 'INT - EST.', 'I/E']) assert.equal(parseScreenplayHeader(`${marker} AUTO - DAY`)?.intExt, IntExt.INT_EXT);
  assert.equal(parseScreenplayHeader('SCENA 7 INT. CUCINA - ALBA')?.dayNight, DayNight.DAWN);
  assert.equal(parseScreenplayHeader('3 INT. CASA - SALOTTO - GIORNO 3')?.setName, 'CASA - SALOTTO');
  assert.equal(parseScreenplayHeader('INT. STATION - DUSK')?.dayNight, DayNight.DUSK);
  assert.equal(parseScreenplayHeader('This is not a heading'), null);
});

test('complete scene breakdown, canonical categories, dialogue exclusions and linked names', () => {
  const result = parseScreenplayLines(page(`1 INT. CUCINA - GIORNO 1
MARCO (35) entra e prende il telefono, una pistola e le chiavi.
Indossa una giacca. Un cane abbaia.

    MARCO (V.O.)
  Ho sognato un cavallo e un fucile.

    ANNA
  Va bene.

2 EXT. STRADA - NIGHT 2
Marco apre la macchina. Una folla guarda la pioggia.
Una sirena risuona. CGI sullo sfondo.`));
  assert.equal(result.summary.sceneCount, 2);
  assert.equal(result.summary.castCount, 2);
  assert.deepEqual(result.data.sceneElements['1'].slice(0, 2), ['MARCO', 'ANNA']);
  assert.ok(result.data.sceneElements['2'].includes('MARCO'));
  assert.ok(result.data.elements.some(e => e.name === 'Giacca' && e.category === ElementCategory.Wardrobe));
  assert.ok(result.data.elements.some(e => e.name === 'Automobile' && e.category === ElementCategory.Vehicles));
  assert.ok(result.data.elements.some(e => e.category === ElementCategory.VFX));
  assert.ok(!result.data.elements.some(e => ['Cavallo', 'Fucile'].includes(e.name)));
  assert.equal(result.data.scenes[1].dayNight, DayNight.NIGHT);
  assert.ok(result.data.scenes[0].scriptText.includes('Ho sognato'));
  assert.ok(!result.data.scenes[0].synopsis.includes('Ho sognato'));
  assert.ok(result.data.scenes.every(s => /^\d+ [0-7]\/8$/.test(s.pageCountInEighths)));
});

test('continued pages, repeated margin headers, plain cues and unique scene numbers', () => {
  const first = page(`INT. CASA - GIORNO

LUCA
Ciao.

3 INT. STANZA - NOTTE
Luca prende una bottiglia.`);
  const second = page(`3 INT. STANZA - NOTTE (CONTINUED) 3
Luca apre una valigia.

3 EXT. PARCO - GIORNO
Un gatto cammina.

INT. CASA - CONTINUOUS
Luca torna a casa.`, 2);
  const title = (p: number) => ({ text: 'COPIONE RISERVATO', page: p, x: 72, top: 30, height: 12, pageHeight: 842 });
  const result = parseScreenplayLines([title(1), ...first, title(2), ...second]);
  assert.equal(result.summary.sceneCount, 4);
  assert.equal(result.summary.castCount, 1);
  assert.equal(new Set(result.data.scenes.map(s => s.sceneNumber)).size, 4);
  assert.ok(result.data.sceneElements['3'].includes('Valigia'));
  assert.ok(result.data.warnings.some(w => w.includes('ripetuto')));
  assert.ok(result.data.warnings.some(w => w.includes('provvisorio')));
  assert.ok(result.data.scenes.every(s => !s.scriptText.includes('RISERVATO')));
});

test('Unicode names, word boundaries, uppercase actions and transitions', () => {
  const result = parseScreenplayLines(page(`INT. SALA - GIORNO
MARCO ENTRA
Marco cammina.

STACCO:

    NICCOLÒ D’AMICO
  Sì.

Il catalogo e il dogma sono sul tavolo.`));
  assert.equal(result.summary.castCount, 1);
  assert.ok(result.data.sceneElements['1'].includes('NICCOLÒ D’AMICO'));
  assert.ok(!result.data.elements.some(e => e.category === ElementCategory.Animals));
});

test('PDF fragments grouped left-to-right without mutating source', () => {
  const items = [{ text: 'GIORNO', x: 240, top: 80, height: 12 }, { text: 'INT. CASA -', x: 72, top: 80.5, height: 12 }];
  const lines = groupScriptLines(items, 1, 842);
  assert.equal(lines[0].text, 'INT. CASA - GIORNO');
  assert.equal(items[0].text, 'GIORNO');
});

test('empty/image-only or unstructured PDF rejected, never invent a scene', () => {
  assert.throws(() => parseScreenplayLines([]), /OCR/);
  assert.throws(() => parseScreenplayLines(page('Elenco troupe\nNomi e cognomi')), /Nessuna intestazione/);
});
