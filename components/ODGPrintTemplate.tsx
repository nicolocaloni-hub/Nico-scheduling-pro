import React from 'react';
import { ODGData, Scene, ODGSceneEntry, ODGCallEntry, ProductionElement } from '../types';

interface ODGPrintTemplateProps {
  data: ODGData;
  projectScenes: Scene[];
  elements: ProductionElement[];
}

export const ODGPrintTemplate: React.FC<ODGPrintTemplateProps> = ({ data, projectScenes, elements }) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getSceneDetails = (sceneId: string) => {
    return projectScenes.find(s => s.id === sceneId);
  };

  const selectedScenes = data.scenes.filter(s => s.selected);

  const calculateTotalPages = () => {
    let totalEighths = 0;
    selectedScenes.forEach(s => {
      const details = getSceneDetails(s.sceneId);
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

  return (
    <div id="odg-print-template" className="bg-white text-black p-8 font-sans text-[10px] leading-tight w-[210mm] min-h-[297mm] mx-auto shadow-2xl">
      {/* PAGE 1 */}
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-2">
          <div className="text-center flex-1">
            <h1 className="text-2xl font-black uppercase tracking-widest">{data.projectName || 'IMPRESSIONI'}</h1>
            <p className="text-xs font-bold uppercase">Regia</p>
            <p className="text-sm font-black uppercase">{data.director || 'ELISA PURITA'}</p>
            <div className="mt-2">
              <p className="font-black uppercase">ODG #{data.odgNumber || data.shootDayNumber}</p>
              <p className="font-bold capitalize">{formatDate(data.date)}</p>
            </div>
          </div>
          <div className="text-right text-[8px] space-y-0.5">
            <p><span className="font-bold">Produzione:</span> {data.projectName}</p>
            <p><span className="font-bold">Produttore Organizzativo:</span> {data.productionOrganizer}</p>
            <p><span className="font-bold">Regista:</span> {data.director}</p>
            <p><span className="font-bold">DoP:</span> {data.dop}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-4 gap-0 border-2 border-black">
          <div className="col-span-3 border-r-2 border-black">
            <div className="grid grid-cols-3 divide-x-2 divide-black border-b-2 border-black">
              <div className="p-1"><span className="font-black uppercase">SET</span></div>
              <div className="col-span-2 p-1 font-bold uppercase">{data.mainSet}</div>
            </div>
            <div className="grid grid-cols-3 divide-x-2 divide-black border-b-2 border-black">
              <div className="p-1"><span className="font-black uppercase">LOCATION 1</span></div>
              <div className="col-span-2 p-1 font-bold uppercase">{data.setAddress}</div>
            </div>
            <div className="grid grid-cols-3 divide-x-2 divide-black border-b-2 border-black">
              <div className="p-1"><span className="font-black uppercase">CAMPO BASE</span></div>
              <div className="col-span-2 p-1 font-bold uppercase">{data.baseCamp}</div>
            </div>
            <div className="grid grid-cols-3 divide-x-2 divide-black border-b-2 border-black">
              <div className="p-1"><span className="font-black uppercase">METRO PIÙ VICINA</span></div>
              <div className="col-span-2 p-1 font-bold uppercase">{data.metroStation}</div>
            </div>
            <div className="grid grid-cols-3 divide-x-2 divide-black">
              <div className="p-1"><span className="font-black uppercase">PARCHEGGIO PIÙ VICINO</span></div>
              <div className="col-span-2 p-1 font-bold uppercase">{data.parkingInfo}</div>
            </div>
          </div>
          <div className="col-span-1 flex flex-col justify-center items-center p-2">
            <div className="text-blue-800 font-black text-xl italic tracking-tighter">PRISMA<span className="text-black">FILM</span></div>
          </div>
        </div>

        {/* Secondary Info Grid */}
        <div className="grid grid-cols-4 border-x-2 border-b-2 border-black divide-x-2 divide-black">
          <div className="col-span-2 space-y-0 divide-y-2 divide-black">
            <div className="p-1 flex justify-between">
              <span className="font-black uppercase">OSPEDALE PIÙ VICINO</span>
              <span className="font-bold uppercase">{data.hospitalInfo}</span>
            </div>
            <div className="grid grid-cols-2 divide-x-2 divide-black">
              <div className="p-1 flex flex-col">
                <span className="font-black uppercase">Produttore esecutivo</span>
                <span className="font-bold">{data.executiveProducer}</span>
              </div>
              <div className="p-1 flex flex-col">
                <span className="font-black uppercase">Organizzatrice di Produzione</span>
                <span className="font-bold">{data.productionOrganizer}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x-2 divide-black">
              <div className="p-1 flex flex-col">
                <span className="font-black uppercase">Regista</span>
                <span className="font-bold">{data.director}</span>
              </div>
              <div className="p-1 flex flex-col">
                <span className="font-black uppercase">Aiuto Regia</span>
                <span className="font-bold">{data.assistantDirector}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x-2 divide-black">
              <div className="p-1 flex flex-col">
                <span className="font-black uppercase">PASTI TROUPE</span>
                <span className="font-bold text-center">24</span>
              </div>
              <div className="p-1 flex flex-col">
                <span className="font-black uppercase">CATERING PRONTO</span>
                <span className="font-bold text-center">{data.lunchTime}</span>
              </div>
              <div className="p-1 flex flex-col">
                <span className="font-black uppercase">PAUSA PRANZO</span>
                <span className="font-bold text-center">Location</span>
              </div>
            </div>
          </div>
          <div className="col-span-2 flex flex-col divide-y-2 divide-black">
            <div className="grid grid-cols-2 divide-x-2 divide-black flex-1">
              <div className="p-1 font-black uppercase">CONVOCAZIONE SET</div>
              <div className="p-1 font-bold text-center flex items-center justify-center">{data.startTime}</div>
            </div>
            <div className="grid grid-cols-2 divide-x-2 divide-black flex-1">
              <div className="p-1 font-black uppercase">PRONTI GIRARE</div>
              <div className="p-1 font-bold text-center flex items-center justify-center">{data.readyToShootTime}</div>
            </div>
            <div className="grid grid-cols-2 divide-x-2 divide-black flex-1">
              <div className="p-1 font-black uppercase">PAUSA</div>
              <div className="p-1 font-bold text-center flex items-center justify-center">{data.lunchTime}</div>
            </div>
            <div className="grid grid-cols-2 divide-x-2 divide-black flex-1">
              <div className="p-1 font-black uppercase">FINE RIPRESE</div>
              <div className="p-1 font-bold text-center flex items-center justify-center">{data.wrapTime}</div>
            </div>
            <div className="grid grid-cols-2 divide-x-2 divide-black flex-1">
              <div className="p-1 font-black uppercase">FINE LAV.</div>
              <div className="p-1 font-bold text-center flex items-center justify-center">{data.endTime}</div>
            </div>
          </div>
        </div>

        {/* Meteo & Motto */}
        <div className="grid grid-cols-4 border-x-2 border-b-2 border-black divide-x-2 divide-black">
          <div className="p-1 flex justify-between items-center">
            <span className="font-black uppercase">Meteo</span>
            <span className="font-bold">{data.weather || data.weatherNotes}</span>
          </div>
          <div className="p-1 flex justify-between items-center">
            <span className="font-black uppercase">Temperatura</span>
            <span className="font-bold">
              {(data.weatherMaxTemp || data.weatherMinTemp) 
                ? `max: ${data.weatherMaxTemp || '-'} min ${data.weatherMinTemp || '-'}`
                : 'N/D'}
            </span>
          </div>
          <div className="col-span-2 p-1 flex justify-between items-center">
            <span className="font-black uppercase">Alba: {data.sunriseTime} - Tramonto: {data.sunsetTime}</span>
          </div>
        </div>
        <div className="border-x-2 border-b-2 border-black p-1 text-center">
          <span className="font-black uppercase italic">Motto del giorno: {data.mottoOfTheDay || 'IL TEMPO VOLA QUANDO CI SI DIVERTE !'}</span>
        </div>

        {/* Scene Table */}
        <table className="w-full border-2 border-black text-center border-collapse">
          <thead>
            <tr className="bg-gray-200 divide-x-2 divide-black border-b-2 border-black">
              <th className="p-1 uppercase font-black">Sc.</th>
              <th className="p-1 uppercase font-black">I/E</th>
              <th className="p-1 uppercase font-black">D/N</th>
              <th className="p-1 uppercase font-black w-1/3">Setting/Description</th>
              <th className="p-1 uppercase font-black">Location</th>
              <th className="p-1 uppercase font-black">Cast - ID</th>
              <th className="p-1 uppercase font-black">DD</th>
              <th className="p-1 uppercase font-black">PAG.</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-black">
            {selectedScenes.map(s => {
              const details = getSceneDetails(s.sceneId);
              return (
                <tr key={s.sceneId} className="divide-x-2 divide-black">
                  <td className="p-1 font-bold">{details?.sceneNumber}</td>
                  <td className="p-1 font-bold">{details?.intExt}</td>
                  <td className="p-1 font-bold">{details?.dayNight}</td>
                  <td className="p-1 text-left font-bold">{details?.slugline} {s.notes && <span className="block text-[8px] italic font-normal">{s.notes}</span>}</td>
                  <td className="p-1 font-bold uppercase">{details?.locationName}</td>
                  <td className="p-1 font-bold">
                    {details?.elementIds
                      .map(eid => elements.find(e => e.id === eid))
                      .filter(e => e && (e.category === 'Cast' || e.category?.toLowerCase() === 'cast'))
                      .map(e => e?.castId || '')
                      .filter(id => id !== '')
                      .join(', ')}
                  </td>
                  <td className="p-1 font-bold">{data.shootDayNumber}</td>
                  <td className="p-1 font-bold">{details?.pageCountInEighths}</td>
                </tr>
              );
            })}
            <tr className="bg-gray-100 divide-x-2 divide-black font-black">
              <td colSpan={7} className="p-1 text-right uppercase">Tot. Pgs.</td>
              <td className="p-1">{calculateTotalPages()}</td>
            </tr>
          </tbody>
        </table>

        {/* Cast Table */}
        <div className="space-y-1">
          <div className="bg-gray-200 border-2 border-black p-1 text-center font-black uppercase">
            CONVOCAZIONE CAST - ID: {data.castCalls.map(c => {
              const el = elements.find(e => e.name.toLowerCase() === c.role.toLowerCase());
              return el?.castId || '';
            }).filter(id => id !== '').join(', ')}
          </div>
          <table className="w-full border-2 border-black text-center border-collapse">
            <thead>
              <tr className="divide-x-2 divide-black border-b-2 border-black">
                <th className="p-1 uppercase font-black">ID</th>
                <th className="p-1 uppercase font-black">PERSONAGGI</th>
                <th className="p-1 uppercase font-black">INTERPRETI</th>
                <th className="p-1 uppercase font-black">SCENE</th>
                <th className="p-1 uppercase font-black">Pick-Up</th>
                <th className="p-1 uppercase font-black">TRU./CAP.</th>
                <th className="p-1 uppercase font-black">COST.</th>
                <th className="p-1 uppercase font-black">PRONTI</th>
                <th className="p-1 uppercase font-black">SET</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black">
              {data.castCalls.map((c, i) => {
                const el = elements.find(e => e.name.toLowerCase() === c.role.toLowerCase());
                return (
                  <tr key={c.id} className="divide-x-2 divide-black">
                    <td className="p-1 font-bold">{el?.castId || i + 1}</td>
                    <td className="p-1 font-bold uppercase">{c.role}</td>
                    <td className="p-1 font-bold">{c.name}</td>
                    <td className="p-1 font-bold">{c.scenes || ''}</td>
                    <td className="p-1 font-bold">{c.pickupTime || ''}</td>
                    <td className="p-1 font-bold">{c.makeupTime || ''}</td>
                    <td className="p-1 font-bold">{c.costumeTime || ''}</td>
                    <td className="p-1 font-bold">{c.readyTime || ''}</td>
                    <td className="p-1 font-bold">{c.setTime || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Department Notes */}
        <div className="space-y-1">
          <div className="bg-gray-200 border-2 border-black p-1 text-center font-black uppercase">
            NOTE PER I REPARTI e FABBISOGNI DI SCENA
          </div>
          <div className="grid grid-cols-2 border-2 border-black divide-x-2 divide-black">
            <div className="p-2 space-y-2">
              <div>
                <p className="font-black uppercase underline">FABBISOGNI DI SCENA/SCENOGRAFIA/ARREDAMENTO:</p>
                <p className="whitespace-pre-wrap">{data.propsNotes}</p>
              </div>
              <div>
                <p className="font-black uppercase underline">COSTUMI:</p>
                <p className="whitespace-pre-wrap">{data.costumeNotes}</p>
              </div>
            </div>
            <div className="p-2 space-y-2">
              <div>
                <p className="font-black uppercase underline">SUONO:</p>
                <p className="whitespace-pre-wrap">{data.soundNotes}</p>
              </div>
              <div>
                <p className="font-black uppercase underline">TRUCCO/ACCONCIATURE:</p>
                <p className="whitespace-pre-wrap">{data.makeupNotes}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between text-[8px] font-bold">
          <div>
            <p>Direttrice di Produzione - Gaia Caputo: +39 345 674 7690</p>
            <p>Runner - Andrea Atzori: +39 339 217 8054</p>
          </div>
          <div className="text-right">
            <p>I Assistente alla Regia - Alice Mancin: +39 334 711 1252</p>
          </div>
        </div>
        <div className="text-center font-black uppercase text-[8px] space-y-0.5">
          <p>NESSUNO STRAORDINARIO È CONSENTITO SENZA L’AUTORIZZAZIONE DELLA PRODUZIONE</p>
          <p>NON SONO AMMESSI VISITATORI SUL SET SE NON PREVENTIVAMENTE AUTORIZZATI DALLA PRODUZIONE</p>
        </div>
      </div>

      {/* PAGE 2 */}
      <div className="mt-16 space-y-4 pt-8 border-t-2 border-dashed border-gray-300">
        <div className="grid grid-cols-2 border-2 border-black divide-x-2 divide-black">
          <div className="p-2">
            <p className="font-black uppercase underline">FOTOGRAFIA:</p>
            <p className="whitespace-pre-wrap">{data.photographyNotes}</p>
          </div>
          <div className="p-2">
            <p className="font-black uppercase underline">PRODUZIONE:</p>
            <p className="whitespace-pre-wrap">{data.productionNotes}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 border-x-2 border-b-2 border-black divide-x-2 divide-black">
          <div className="p-2">
            <p className="font-black uppercase underline">REGIA:</p>
            <p className="whitespace-pre-wrap">{data.regiaNotes}</p>
          </div>
          <div className="p-2">
            <p className="font-black uppercase underline">ANIMALI / VEICOLI / COMPARSE:</p>
            <p className="whitespace-pre-wrap">{data.animaliNotes}</p>
          </div>
        </div>

        {/* Troupe Call Table */}
        <div className="space-y-1">
          <div className="bg-gray-200 border-2 border-black p-1 text-center font-black uppercase">
            - CONVOCAZIONE TROUPE -
          </div>
          <table className="w-full border-2 border-black text-center border-collapse">
            <thead>
              <tr className="bg-gray-100 divide-x-2 divide-black border-b-2 border-black">
                <th className="p-1 uppercase font-black">REGIA</th>
                <th className="p-1 uppercase font-black">FOTOGRAFIA</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black">
              <tr className="divide-x-2 divide-black">
                <td className="p-0 align-top">
                  <table className="w-full border-collapse">
                    <tbody className="divide-y-2 divide-black">
                      <tr className="p-1">
                        <td className="w-full flex justify-between">
                          <span className="font-bold">Regista</span>
                          <span>{data.director}</span>
                          <span>09:30</span>
                        </td>
                      </tr>
                      <tr className="p-1">
                        <td className="w-full flex justify-between">
                          <span className="font-bold">Aiuto Regista</span>
                          <span>{data.assistantDirector}</span>
                          <span>08:30</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
                <td className="p-0 align-top">
                  <table className="w-full border-collapse">
                    <tbody className="divide-y-2 divide-black">
                      <tr className="p-1">
                        <td className="w-full flex justify-between">
                          <span className="font-bold">DOP</span>
                          <span>{data.dop}</span>
                          <span>09:00</span>
                        </td>
                      </tr>
                      <tr className="p-1">
                        <td className="w-full flex justify-between">
                          <span className="font-bold">Operatore</span>
                          <span>Giacomo Colombo</span>
                          <span>09:00</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legal/Safety Notes */}
        <div className="text-[7px] text-center font-bold space-y-1">
          <p>SI RICORDA L’UTILIZZO OBBLIGATORIO DEL MATERIALE DI SICUREZZA FORNITO DALLA PRODUZIONE (Legge 81/08). LE CASSETTE DEL PRONTO SOCCORSO SONO LOCALIZZATE SUL SET E AL CAMPO BASE.</p>
          <p>SI RICORDA A TUTTI I MEMBRI DELLA TROUPE CHE È TASSATIVAMENTE PROIBITO SCATTARE FOTOGRAFIE O GIRARE VIDEO SUL SET E AL CAMPO BASE, CHE NON E’ CONSENTITO PORTARE SUL SET PERSONE ESTRANEE SENZA L’AUTORIZZAZIONE PREVENTIVA DA PARTE DELLA PRODUZIONE, CHE È VIETATO TENERE ACCESI I TELEFONI CELLULARI DURANTE LE RIPRESE, FUMARE SUL SET E INDOSSARE CALZATURE NON IDONEE AD UN SET CINEMATOGRAFICO.</p>
          <p className="underline">SI RACCOMANDA ATTENZIONE NELLA DIFFERENZIAZIONE DEI RIFIUTI SUL SET.</p>
        </div>

        {/* Signatures */}
        <div className="flex justify-around pt-8">
          <div className="text-center">
            <p className="font-black uppercase">Aiuto Regia</p>
            <p className="font-bold mt-1">{data.assistantDirector}</p>
          </div>
          <div className="text-center">
            <p className="font-black uppercase">Direttrice di Produzione</p>
            <p className="font-bold mt-1">Gaia Caputo</p>
          </div>
        </div>
      </div>
    </div>
  );
};
