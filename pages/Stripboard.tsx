
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/store';
import { Stripboard, Strip, Scene, DayNight, IntExt } from '../types';
import { Button } from '../components/Button';

// Utility per ottenere il colore della striscia basato sui metadati della Scena
const getStripColor = (scene: Scene) => {
    // Fix: removed redundant check for 'GIORNO' as it is the value of DayNight.DAY
    const isDay = scene.dayNight === DayNight.DAY;
    if (isDay) {
        if (scene.intExt === IntExt.INT) return 'bg-white text-gray-900';
        return 'bg-yellow-100 text-gray-900';
    } else { // Notte
        if (scene.intExt === IntExt.INT) return 'bg-blue-900 text-white border border-blue-700';
        return 'bg-blue-950 text-white border border-blue-800';
    }
};

export const StripboardView: React.FC = () => {
    const navigate = useNavigate();
    const [board, setBoard] = useState<Stripboard | null>(null);
    const [scenes, setScenes] = useState<Record<string, Scene>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const pid = localStorage.getItem('currentProjectId');
        if (!pid) return navigate('/');

        const boards = await db.getStripboards(pid);
        const projectScenes = await db.getProjectScenes(pid);
        
        const sceneMap: Record<string, Scene> = {};
        projectScenes.forEach(s => sceneMap[s.id] = s);
        setScenes(sceneMap);

        if (boards.length > 0) {
            setBoard(boards[0]);
        }
        setLoading(false);
    };

    const moveStrip = (index: number, direction: 'up' | 'down') => {
        if (!board) return;
        const newStrips = [...board.strips];
        
        if (direction === 'up' && index > 0) {
            [newStrips[index], newStrips[index - 1]] = [newStrips[index - 1], newStrips[index]];
        } else if (direction === 'down' && index < newStrips.length - 1) {
            [newStrips[index], newStrips[index + 1]] = [newStrips[index + 1], newStrips[index]];
        }

        const updatedBoard = { ...board, strips: newStrips };
        setBoard(updatedBoard);
        db.saveStripboard(updatedBoard); // Autosave
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Caricamento piano...</div>;

    if (!board) return (
        <div className="p-8 text-center">
            <h2 className="text-xl mb-4">Nessun Piano di Lavorazione trovato</h2>
            <p>Per favore, importa prima una sceneggiatura.</p>
            <Button onClick={() => navigate('/script')} className="mt-4">Importa Sceneggiatura</Button>
        </div>
    );

    const totalPages = board.strips.reduce((acc, strip) => {
        const scene = scenes[strip.sceneId];
        return acc + (scene ? scene.pages : 0);
    }, 0);

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col">
            <header className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-xl font-bold">{board.name}</h1>
                    <span className="text-sm text-gray-400">{board.strips.length} Scene • {totalPages.toFixed(1)} Pagine</span>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" className="px-3 py-1 text-sm">Fine Giornata</Button>
                    <Button variant="primary" className="px-3 py-1 text-sm">Ordina con AI</Button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto pr-2 space-y-1 pb-20 no-scrollbar">
                {board.strips.map((strip, index) => {
                    const scene = scenes[strip.sceneId];
                    if (!scene) return null;

                    const colorClass = getStripColor(scene);

                    return (
                        <div 
                            key={strip.id} 
                            className={`relative group flex items-center h-12 rounded shadow-sm overflow-hidden select-none ${colorClass}`}
                        >
                            <div className="w-8 h-full bg-black/10 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => moveStrip(index, 'up')} className="hover:text-primary-600 text-[10px] leading-none">▲</button>
                                <button onClick={() => moveStrip(index, 'down')} className="hover:text-primary-600 text-[10px] leading-none">▼</button>
                            </div>

                            <div className="w-12 text-center font-bold text-lg border-r border-black/10">
                                {scene.sceneNumber}
                            </div>

                            <div className="flex-1 px-4 flex items-baseline gap-2 overflow-hidden whitespace-nowrap">
                                <span className="font-bold text-xs opacity-70">{scene.intExt}</span>
                                <span className="font-bold truncate">{scene.slugline.replace(/^(INT\.|EST\.|EXT\.)\s*/, '')}</span>
                                <span className="text-xs opacity-70 ml-auto">{scene.dayNight}</span>
                            </div>

                            <div className="w-16 text-center text-sm font-medium border-l border-black/10">
                                {scene.pages.toFixed(1)} p
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
