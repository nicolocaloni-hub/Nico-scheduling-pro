import React from 'react';
import { ODGData, Scene, ODGSceneEntry, ODGCallEntry, ProductionElement } from '../types';

const CREW_DEPARTMENTS: Record<string, string[]> = {
  'REGIA': ['Regista', 'Aiuto Regista', 'Assistente alla Regia', "Segretaria d'edizione"],
  'PRODUZIONE': ['Produttore Esecutivo', 'Organizzatrice di Produzione', 'Direttrice di Produzione', 'Runner'],
  'FOTOGRAFIA': ['DOP', 'Operatore (Steady)', 'Assistente Operatore', 'Aiuto Operatore', 'Video assist', 'Fotografo di Scena'],
  'ELETTRICISTI': ['Gaffer', 'Elettricista', 'Grip'],
  'COSTUMI': ['Costumista'],
  'TRUCCO': ['Truccatrice'],
  'SCENOGRAFIA': ['Scenografa', 'Aiuto Scenografia'],
  'SUONO': ['Fonico', 'Microfonista'],
  'VFX': ['Supervisore effetti visivi']
};

interface ODGPrintTemplateProps {
  data: ODGData;
  projectScenes: Scene[];
  elements: ProductionElement[];
}

export const ODGPrintTemplate: React.FC<ODGPrintTemplateProps> = ({ data, projectScenes, elements }) => {
  const getCrewForDepartment = (dept: string) => {
    const predefinedRoles = CREW_DEPARTMENTS[dept] || [];
    const explicitCalls = data.crewCalls.filter(c => c.department === dept);
    const inferredCalls = data.crewCalls.filter(c => 
      !c.department && predefinedRoles.some(pr => pr.toLowerCase() === c.role.toLowerCase())
    );
    
    const allCalls = [...explicitCalls, ...inferredCalls];
    const rows = allCalls.map(call => ({
      role: call.role,
      name: call.name,
      time: call.callTime
    }));
    
    // Add empty rows as "spazi sotto" if there are fewer than 4 members
    const minRows = 4;
    while (rows.length < minRows) {
      rows.push({
        role: '',
        name: '',
        time: ''
      });
    }
    
    return rows;
  };

  const renderCrewDepartment = (dept: string) => {
    const rows = getCrewForDepartment(dept);
    return (
      <React.Fragment key={dept}>
        <div className="bg-gray-50 p-1 text-center font-bold uppercase">{dept}</div>
        {rows.map((row, idx) => (
          <div key={idx} className="flex divide-x divide-black text-[8px]">
            <div className="w-[40%] p-1 text-left truncate">{row.role}</div>
            <div className="w-[45%] p-1 text-left truncate">{row.name}</div>
            <div className="w-[15%] p-1 text-center">{row.time}</div>
          </div>
        ))}
      </React.Fragment>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getSceneDetails = (s: ODGSceneEntry) => {
    if (s.isManual && s.manualData) {
      return {
        id: s.sceneId,
        sceneNumber: s.manualData.sceneNumber || '-',
        intExt: (s.manualData.intExt || 'INT') as never,
        dayNight: (s.manualData.dayNight || 'GIORNO') as never,
        slugline: s.manualData.slugline || 'SCENA MANUALE',
        locationName: s.manualData.locationName || '',
        elementIds: [],
        pageCountInEighths: s.manualData.pages || '',
        manualCastIds: s.manualData.castIds || ''
      };
    }
    return projectScenes.find(sc => sc.id === s.sceneId);
  };

  const selectedScenes = data.scenes.filter(s => s.selected);

  const calculateTotalPages = () => {
    let totalEighths = 0;
    selectedScenes.forEach(s => {
      const details = getSceneDetails(s);
      if (details?.pageCountInEighths) {
        const parts = details.pageCountInEighths.split(' ');
        if (parts.length === 1) {
          if (parts[0].includes('/')) {
            const [num, den] = parts[0].split('/').map(Number);
            totalEighths += (num / den) * 8;
          } else {
            totalEighths += Number(parts[0]) * 8;
          }
        } else if (parts.length === 2) {
          totalEighths += Number(parts[0]) * 8;
          const [num, den] = parts[1].split('/').map(Number);
          totalEighths += (num / den) * 8;
        }
      }
    });
    const pages = Math.floor(totalEighths / 8);
    const eighths = totalEighths % 8;
    return `${pages > 0 ? pages : ''} ${eighths > 0 ? `${eighths}/8` : ''}`.trim() || '0';
  };

  const castCalls = data.castCalls.filter(c => c.role.trim() !== '' || c.name.trim() !== '');
  const castIds = castCalls.map(c => {
    const el = elements.find(e => e.name.toLowerCase() === c.role.toLowerCase());
    return el?.castId || '';
  }).filter(id => id !== '').join(',');

  return (
    <div id="odg-print-template" className="bg-white text-black p-6 font-sans text-[9px] leading-tight w-[210mm] min-h-[297mm] mx-auto shadow-2xl flex flex-col gap-2">
      {/* PAGE 1 */}
      
      {/* Header */}
      <div className="flex justify-between items-start mb-2 relative min-h-[80px]">
        <div className="flex-1 text-center">
          <h1 className="text-2xl font-black uppercase tracking-widest">{data.projectName || 'IMPRESSIONI'}</h1>
          <p className="text-[10px] italic">Regia</p>
          <p className="text-sm font-bold uppercase">{data.director || 'Nome Regista'}</p>
          <div className="mt-2">
            <p className="text-sm font-black uppercase">ODG #{data.odgNumber || data.shootDayNumber}</p>
            <p className="text-sm font-bold capitalize">{formatDate(data.date)}</p>
          </div>
        </div>
        <div className="text-right text-[8px] space-y-0.5 absolute right-0 top-0 flex flex-col items-end">
          {data.productionLogo && (
            <div className="border border-black p-2 mb-2 bg-white flex items-center justify-center min-w-[100px]">
              <img src={data.productionLogo} alt="Logo" className="max-h-16 max-w-[150px] object-contain" />
            </div>
          )}
          <p><span className="font-bold">Produzione:</span> {data.projectName}</p>
          <p><span className="font-bold">Produttore Organizzativo:</span> {data.productionOrganizer}</p>
          <p><span className="font-bold">DoP:</span> {data.dop}</p>
          <p><span className="font-bold">Fonico:</span> {data.soundMixer}</p>
          <p><span className="font-bold">Scenografia:</span> {data.productionDesigner}</p>
          <p><span className="font-bold">Costumista:</span> {data.costumeDesigner}</p>
        </div>
      </div>

      {/* Info Grid 1 */}
      <div className="border border-black flex">
        <div className="flex-1 flex flex-col divide-y divide-black border-r border-black">
          <div className="flex divide-x divide-black">
            <div className="w-1/4 p-1 font-bold uppercase">SET</div>
            <div className="w-3/4 p-1 font-bold uppercase">{data.mainSet}</div>
          </div>
          <div className="flex divide-x divide-black">
            <div className="w-1/4 p-1 font-bold uppercase">LOCATION 1</div>
            <div className="w-3/4 p-1 font-bold">{data.setAddress}</div>
          </div>
          <div className="flex divide-x divide-black">
            <div className="w-1/4 p-1 font-bold uppercase">CAMPO BASE</div>
            <div className="w-3/4 p-1 font-bold">{data.baseCamp}</div>
          </div>
          <div className="flex divide-x divide-black">
            <div className="w-1/4 p-1 font-bold uppercase text-red-600">METRO PIÙ VICINA</div>
            <div className="w-3/4 p-1 font-bold">{data.metroStation}</div>
          </div>
          <div className="flex divide-x divide-black">
            <div className="w-1/4 p-1 font-bold uppercase">PARCHEGGIO PIÙ VICINO</div>
            <div className="w-3/4 p-1 font-bold">{data.parkingInfo}</div>
          </div>
        </div>
        <div className="w-1/4 flex items-center justify-center p-2">
          <div className="text-blue-800 font-black text-2xl tracking-tighter">PRISMA<span className="text-black">FILM</span></div>
        </div>
      </div>

      {/* Info Grid 2 */}
      <div className="border border-black flex flex-col divide-y divide-black">
        <div className="flex divide-x divide-black">
          <div className="w-1/4 p-1 font-bold uppercase">OSPEDALE PIÙ VICINO</div>
          <div className="w-1/2 p-1">{data.hospitalInfo}</div>
          <div className="w-[12.5%] p-1 font-bold uppercase">CONVOCAZIONE SET</div>
          <div className="w-[12.5%] p-1 font-bold">{data.startTime}</div>
        </div>
        <div className="flex divide-x divide-black">
          <div className="w-1/4 p-1 font-bold uppercase">Produttore esecutivo</div>
          <div className="w-1/4 p-1">{data.executiveProducer}</div>
          <div className="w-1/4 p-1 font-bold uppercase">PASTI TROUPE: {data.crewMeals || 0}</div>
          <div className="w-[12.5%] p-1 font-bold uppercase">PRONTI A GIRARE</div>
          <div className="w-[12.5%] p-1 font-bold">{data.readyToShootTime}</div>
        </div>
        <div className="flex divide-x divide-black">
          <div className="w-1/4 p-1 font-bold uppercase">Organizzatrice di Produzione</div>
          <div className="w-1/4 p-1">{data.productionOrganizer}</div>
          <div className="w-1/4 p-1 font-bold uppercase">CATERING PRONTO ALLE: {data.lunchTime}</div>
          <div className="w-[12.5%] p-1 font-bold uppercase">PAUSA</div>
          <div className="w-[12.5%] p-1 font-bold">{data.lunchTime}</div>
        </div>
        <div className="flex divide-x divide-black">
          <div className="w-1/4 p-1 font-bold uppercase">Aiuto Regia</div>
          <div className="w-1/4 p-1">{data.assistantDirector}</div>
          <div className="w-1/4 p-1 font-bold uppercase">PAUSA PRANZO IN: Location</div>
          <div className="w-[12.5%] p-1 font-bold uppercase">FINE RIPRESE</div>
          <div className="w-[12.5%] p-1 font-bold">{data.wrapTime}</div>
        </div>
        <div className="flex divide-x divide-black">
          <div className="w-1/4 p-1 font-bold uppercase italic">Meteo</div>
          <div className="w-1/4 p-1 italic">{data.weather || data.weatherNotes}</div>
          <div className="w-1/4 p-1 font-bold">Temperatura max: {data.weatherMaxTemp || '-'} min {data.weatherMinTemp || '-'}</div>
          <div className="w-[12.5%] p-1 font-bold uppercase">FINE LAVORAZIONE</div>
          <div className="w-[12.5%] p-1 font-bold">{data.endTime}</div>
        </div>
        <div className="flex divide-x divide-black">
          <div className="w-1/4 p-1 font-bold uppercase italic">Motto del giorno</div>
          <div className="w-1/2 p-1 font-bold italic uppercase">{data.mottoOfTheDay || 'IL TEMPO VOLA QUANDO CI SI DIVERTE !'}</div>
          <div className="w-1/4 p-1 font-bold">Alba: {data.sunriseTime} - Tramonto: {data.sunsetTime}</div>
        </div>
      </div>

      {/* Footer Notes */}
      <div className="text-center text-[8px] italic my-2">
        <p>NESSUNO STRAORDINARIO È CONSENTITO SENZA L'AUTORIZZAZIONE DELLA PRODUZIONE</p>
        <p>NON SONO AMMESSI VISITATORI SUL SET SE NON PREVENTIVAMENTE AUTORIZZATI DALLA PRODUZIONE</p>
      </div>

      {/* Scene Table */}
      <table className="w-full border border-black text-center border-collapse">
        <thead>
          <tr className="divide-x divide-black border-b border-black bg-gray-50">
            <th className="p-1 font-bold">Sc.</th>
            <th className="p-1 font-bold">I/E</th>
            <th className="p-1 font-bold">D/N</th>
            <th className="p-1 font-bold w-1/3">Setting/Description</th>
            <th className="p-1 font-bold">Location</th>
            <th className="p-1 font-bold">Cast - ID</th>
            <th className="p-1 font-bold">DD</th>
            <th className="p-1 font-bold">PAG.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black">
          {selectedScenes.map(s => {
            const details = getSceneDetails(s);
            // Handling for manualCastIds
            let castDisplay = '-';
            if (s.isManual && s.manualData?.castIds) {
              castDisplay = s.manualData.castIds;
            } else if (details?.elementIds) {
              castDisplay = details.elementIds
                .map(eid => elements.find(e => e.id === eid))
                .filter(e => e && (e.category === 'Cast' || e.category?.toLowerCase() === 'cast'))
                .map(e => e?.castId || '')
                .filter(id => id !== '')
                .join(', ') || '-';
            }

            return (
              <tr key={s.sceneId} className="divide-x divide-black">
                <td className="p-1">{details?.sceneNumber}</td>
                <td className="p-1 uppercase">{details?.intExt}</td>
                <td className="p-1 uppercase">{details?.dayNight}</td>
                <td className="p-1 text-left">{details?.slugline} {s.notes && <span className="block text-[8px] italic">{s.notes}</span>}</td>
                <td className="p-1 uppercase font-bold">{details?.locationName}</td>
                <td className="p-1">{castDisplay}</td>
                <td className="p-1">{data.shootDayNumber}</td>
                <td className="p-1">{details?.pageCountInEighths}</td>
              </tr>
            );
          })}
          <tr className="divide-x divide-black font-bold">
            <td colSpan={7} className="p-1 text-right">Tot. Pgs.</td>
            <td className="p-1">{calculateTotalPages()}</td>
          </tr>
        </tbody>
      </table>

      {/* Cast Table */}
      <div className="border border-black mt-2">
        <div className="bg-gray-100 border-b border-black p-1 text-center font-bold uppercase">
          CONVOCAZIONE CAST - ID: {castIds}
        </div>
        <table className="w-full text-center border-collapse">
          <thead>
            <tr className="divide-x divide-black border-b border-black bg-gray-50">
              <th className="p-1 font-bold">ID</th>
              <th className="p-1 font-bold">PERSONAGGI</th>
              <th className="p-1 font-bold">INTERPRETI</th>
              <th className="p-1 font-bold">SCENE</th>
              <th className="p-1 font-bold">Pick-Up</th>
              <th className="p-1 font-bold">TRU./CAP.</th>
              <th className="p-1 font-bold">COST.</th>
              <th className="p-1 font-bold">PRONTI</th>
              <th className="p-1 font-bold">SET</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black">
            {castCalls.length > 0 ? castCalls.map((c, i) => {
              const el = elements.find(e => e.name.toLowerCase() === c.role.toLowerCase());
              
              // Calculate scenes for this cast member
              const castScenes = selectedScenes.filter(s => {
                if (s.isManual && s.manualData?.castIds) {
                  // check if castId (el?.castId) is in the comma separated string
                  const ids = s.manualData.castIds.split(',').map(str => str.trim());
                  return ids.includes(String(el?.castId));
                }
                const details = getSceneDetails(s);
                return details?.elementIds?.includes(el?.id || '');
              }).map(s => getSceneDetails(s)?.sceneNumber).filter(Boolean).join(', ');

              return (
                <tr key={c.id} className="divide-x divide-black">
                  <td className="p-1">{el?.castId || i + 1}</td>
                  <td className="p-1">{c.role}</td>
                  <td className="p-1">{c.name}</td>
                  <td className="p-1">{castScenes || '-'}</td>
                  <td className="p-1">{c.callTime}</td>
                  <td className="p-1">{c.readyTime}</td>
                  <td className="p-1">{c.readyTime}</td>
                  <td className="p-1">{c.readyTime}</td>
                  <td className="p-1">{data.startTime}</td>
                </tr>
              );
            }) : (
              <tr className="divide-x divide-black">
                <td className="p-1">-</td>
                <td className="p-1">-</td>
                <td className="p-1">-</td>
                <td className="p-1">-</td>
                <td className="p-1">-</td>
                <td className="p-1">-</td>
                <td className="p-1">-</td>
                <td className="p-1">-</td>
                <td className="p-1">-</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Figurazioni Speciali */}
      <div className="border border-black mt-2">
        <div className="bg-gray-100 border-b border-black p-1 text-center font-bold uppercase">
          CONVOCAZIONE FIGURAZIONI SPECIALI - TOT 0
        </div>
        <table className="w-full text-center border-collapse">
          <thead>
            <tr className="divide-x divide-black border-b border-black bg-gray-50">
              <th className="p-1 font-bold">ID</th>
              <th className="p-1 font-bold">PERSONAGGI</th>
              <th className="p-1 font-bold">INTERPRETI</th>
              <th className="p-1 font-bold">SCENE</th>
              <th className="p-1 font-bold">Pick-Up</th>
              <th className="p-1 font-bold">TRU./CAP.</th>
              <th className="p-1 font-bold">COST.</th>
              <th className="p-1 font-bold">PRONTI</th>
              <th className="p-1 font-bold">SET</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black">
            <tr className="divide-x divide-black">
              <td className="p-1">-</td>
              <td className="p-1">-</td>
              <td className="p-1">-</td>
              <td className="p-1">-</td>
              <td className="p-1">-</td>
              <td className="p-1">-</td>
              <td className="p-1">-</td>
              <td className="p-1">-</td>
              <td className="p-1">-</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Figurazioni */}
      <div className="border border-black mt-2">
        <div className="bg-gray-100 border-b border-black p-1 text-center font-bold uppercase">
          CONVOCAZIONE FIGURAZIONI - TOT 0
        </div>
        <table className="w-full text-center border-collapse">
          <thead>
            <tr className="divide-x divide-black border-b border-black bg-gray-50">
              <th className="p-1 font-bold">ID</th>
              <th className="p-1 font-bold">PERSONAGGI</th>
              <th className="p-1 font-bold">INTERPRETI</th>
              <th className="p-1 font-bold">SCENE</th>
              <th className="p-1 font-bold">Pick-Up</th>
              <th className="p-1 font-bold">TRU./CAP.</th>
              <th className="p-1 font-bold">COST.</th>
              <th className="p-1 font-bold">PRONTI</th>
              <th className="p-1 font-bold">SET</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black">
            <tr className="divide-x divide-black">
              <td className="p-1">-</td>
              <td className="p-1">-</td>
              <td className="p-1">-</td>
              <td className="p-1">-</td>
              <td className="p-1">-</td>
              <td className="p-1">-</td>
              <td className="p-1">-</td>
              <td className="p-1">-</td>
              <td className="p-1">-</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notes */}
      <div className="border border-black mt-2">
        <div className="bg-gray-100 border-b border-black p-1 text-center font-bold uppercase">
          NOTE PER I REPARTI e FABBISOGNI DI SCENA
        </div>
        <div className="grid grid-cols-2 divide-x divide-black">
          <div className="p-2 min-h-[60px]">
            <p className="font-bold uppercase mb-1">FABBISOGNI DI SCENA/SCENOGRAFIA/ARREDAMENTO:</p>
            <p className="whitespace-pre-wrap">{data.propsNotes}</p>
          </div>
          <div className="p-2 min-h-[60px]">
            <p className="font-bold uppercase mb-1">SUONO:</p>
            <p className="whitespace-pre-wrap">{data.soundNotes}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x border-t divide-black border-black">
          <div className="p-2 min-h-[40px]">
            <p className="font-bold uppercase mb-1">COSTUMI:</p>
            <p className="whitespace-pre-wrap">{data.costumeNotes}</p>
          </div>
          <div className="p-2 min-h-[40px]">
            <p className="font-bold uppercase mb-1">TRUCCO/ACCONCIATURE:</p>
            <p className="whitespace-pre-wrap">{data.makeupNotes}</p>
          </div>
        </div>
      </div>

      {/* Page Break for PDF */}
      <div className="break-before-page mt-8"></div>

      {/* PAGE 2 */}
      <div className="border border-black mt-2">
        <div className="grid grid-cols-2 divide-x divide-black">
          <div className="p-2 min-h-[80px]">
            <p className="font-bold uppercase mb-1">FOTOGRAFIA:</p>
            <p className="whitespace-pre-wrap">{data.photographyNotes}</p>
          </div>
          <div className="p-2 min-h-[80px]">
            <p className="font-bold uppercase mb-1">PRODUZIONE:</p>
            <p className="whitespace-pre-wrap">{data.productionNotes}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x border-t divide-black border-black">
          <div className="p-2 min-h-[60px]">
            <p className="font-bold uppercase mb-1">REGIA:</p>
            <p className="whitespace-pre-wrap">{data.regiaNotes}</p>
          </div>
          <div className="p-2 min-h-[60px]">
            <p className="font-bold uppercase mb-1">ANIMALI:</p>
            <p className="whitespace-pre-wrap">{data.animaliNotes}</p>
          </div>
        </div>
      </div>

      {/* Crew Table */}
      <div className="border border-black mt-4">
        <div className="bg-gray-100 border-b border-black p-1 text-center font-bold uppercase">
          - CONVOCAZIONE TROUPE -
        </div>
        <div className="grid grid-cols-3 divide-x divide-black">
          {/* Colonna 1 */}
          <div className="flex flex-col divide-y divide-black">
            {renderCrewDepartment('REGIA')}
            {renderCrewDepartment('PRODUZIONE')}
            {renderCrewDepartment('VFX')}
          </div>
          
          {/* Colonna 2 */}
          <div className="flex flex-col divide-y divide-black">
            {renderCrewDepartment('FOTOGRAFIA')}
            {renderCrewDepartment('ELETTRICISTI')}
            <div className="flex-1"></div>
          </div>

          {/* Colonna 3 */}
          <div className="flex flex-col divide-y divide-black">
            {renderCrewDepartment('COSTUMI')}
            {renderCrewDepartment('TRUCCO')}
            {renderCrewDepartment('SCENOGRAFIA')}
            {renderCrewDepartment('SUONO')}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-[6px] text-center text-gray-600 uppercase">
        <p>SI RICORDA L'UTILIZZO OBBLIGATORIO DEL MATERIALE DI SICUREZZA FORNITO DALLA PRODUZIONE (Legge 81/08). LE CASSETTE DEL PRONTO SOCCORSO SONO LOCALIZZATE SUL SET E AL CAMPO BASE.</p>
        <p>SI RICORDA A TUTTI I MEMBRI DELLA TROUPE CHE È TASSATIVAMENTE PROIBITO SCATTARE FOTOGRAFIE O GIRARE VIDEO SUL SET E AL CAMPO BASE, CHE NON E' CONSENTITO PORTARE SUL SET PERSONE ESTRANEE SENZA L'AUTORIZZAZIONE PREVENTIVA DA PARTE DELLA PRODUZIONE, CHE È VIETATO TENERE ACCESI I TELEFONI CELLULARI DURANTE LE RIPRESE, FUMARE SUL SET E INDOSSARE CALZATURE NON IDONEE AD UN SET CINEMATOGRAFICO.</p>
        <p className="font-bold underline mt-1">SI RACCOMANDA ATTENZIONE NELLA DIFFERENZIAZIONE DEI RIFIUTI SUL SET.</p>
      </div>

      <div className="mt-12 flex justify-around text-center font-bold">
        <div>
          <p>Aiuto Regia</p>
          <p className="font-normal">{data.assistantDirector}</p>
        </div>
        <div>
          <p>Direttrice di Produzione</p>
          <p className="font-normal">{data.productionOrganizer}</p>
        </div>
      </div>
    </div>
  );
};
