import React from 'react';

interface SummaryData {
  sceneCount: number;
  locationCount: number;
  castCount: number;
  propsCount: number;
}

interface PreviewData {
  scenes: any[];
  elements: any[];
}

interface ResultsPreviewProps {
  summary: SummaryData;
  previewData: PreviewData | null;
}

export const ResultsPreview: React.FC<ResultsPreviewProps> = ({ summary, previewData }) => {
  // Extract top items for preview
  const topScenes = previewData?.scenes?.slice(0, 3) || [];
  
  // Group elements by category for preview
  const elements = previewData?.elements || [];
  const locations = elements.filter((e: any) => e.category === 'location').slice(0, 5);
  const characters = elements.filter((e: any) => e.category === 'character').slice(0, 5);
  const props = elements.filter((e: any) => e.category === 'prop').slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Counts Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Scene" value={summary.sceneCount} icon="fa-clapperboard" color="text-blue-400" />
        <StatCard label="Location" value={summary.locationCount} icon="fa-location-dot" color="text-yellow-400" />
        <StatCard label="Personaggi" value={summary.castCount} icon="fa-users" color="text-purple-400" />
        <StatCard label="Props" value={summary.propsCount} icon="fa-box-open" color="text-green-400" />
      </div>

      {/* Preview Lists */}
      {previewData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Scenes Preview */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <i className="fa-solid fa-film"></i> Anteprima Scene
            </h3>
            <div className="space-y-2">
              {topScenes.map((scene: any, idx: number) => (
                <div key={idx} className="bg-gray-900/50 p-2 rounded border border-gray-800 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white">SCENA {scene.sceneNumber}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                      {scene.intExt} • {scene.dayNight}
                    </span>
                  </div>
                  <div className="text-gray-400 truncate font-mono text-[10px]">
                    {scene.slugline}
                  </div>
                </div>
              ))}
              {summary.sceneCount > 3 && (
                <div className="text-[10px] text-center text-gray-500 italic pt-1">
                  + altre {summary.sceneCount - 3} scene...
                </div>
              )}
            </div>
          </div>

          {/* Elements Preview */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Location Principali</h3>
              <div className="flex flex-wrap gap-1.5">
                {locations.map((loc: any, i: number) => (
                  <span key={i} className="px-2 py-1 rounded bg-yellow-900/20 text-yellow-200 border border-yellow-700/30 text-[10px]">
                    {loc.name}
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Cast Principale</h3>
              <div className="flex flex-wrap gap-1.5">
                {characters.map((char: any, i: number) => (
                  <span key={i} className="px-2 py-1 rounded bg-purple-900/20 text-purple-200 border border-purple-700/30 text-[10px]">
                    {char.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: { label: string, value: number, icon: string, color: string }) => (
  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center justify-between shadow-lg">
    <div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</p>
    </div>
    <div className={`w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center ${color}`}>
      <i className={`fa-solid ${icon}`}></i>
    </div>
  </div>
);
