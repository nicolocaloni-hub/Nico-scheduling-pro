
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/store';
import { Stripboard, Scene } from '../types';
import { Button } from '../components/Button';
import { PlanAccordionItem } from '../components/PlanAccordionItem';

export const StripboardView: React.FC = () => {
    const navigate = useNavigate();
    const [boards, setBoards] = useState<Stripboard[]>([]);
    const [scenes, setScenes] = useState<Record<string, Scene>>({});
    const [loading, setLoading] = useState(true);
    const [openBoardId, setOpenBoardId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const pid = localStorage.getItem('currentProjectId');
        if (!pid) return navigate('/');

        try {
            const [fetchedBoards, projectScenes] = await Promise.all([
                db.getStripboards(pid),
                db.getProjectScenes(pid)
            ]);
            
            const sceneMap: Record<string, Scene> = {};
            projectScenes.forEach(s => sceneMap[s.id] = s);
            setScenes(sceneMap);
            setBoards(fetchedBoards);
            
            // If only one board exists, open it by default? Or keep closed as per request "cliccando... si apre".
            // Let's keep it closed or open the first one if user prefers. 
            // User said "cliccando su un item si apre", implies closed by default or list view.
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleBoardUpdate = (updatedBoard: Stripboard) => {
        setBoards(prev => prev.map(b => b.id === updatedBoard.id ? updatedBoard : b));
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-8 space-y-4">
                <div className="h-8 bg-gray-800 rounded w-1/3 animate-pulse"></div>
                <div className="h-20 bg-gray-800 rounded-2xl animate-pulse"></div>
                <div className="h-20 bg-gray-800 rounded-2xl animate-pulse"></div>
            </div>
        );
    }

    if (boards.length === 0) {
        return (
            <div className="max-w-4xl mx-auto p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                    <i className="fa-solid fa-clipboard-list text-3xl text-gray-600"></i>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white mb-2">Nessun Piano di Lavorazione</h2>
                    <p className="text-gray-400">Importa una sceneggiatura per generare il primo piano.</p>
                </div>
                <Button onClick={() => navigate('/script')} className="mx-auto">
                    Importa Sceneggiatura
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 h-[calc(100vh-80px)] flex flex-col">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-white mb-2">Piani di Lavorazione</h1>
                <p className="text-gray-400">Gestisci i tuoi piani e ottimizza le giornate di ripresa.</p>
            </header>

            <div className="flex-1 overflow-y-auto space-y-4 pb-20 no-scrollbar">
                {boards.map(board => (
                    <PlanAccordionItem
                        key={board.id}
                        board={board}
                        scenes={scenes}
                        isOpen={openBoardId === board.id}
                        onToggle={() => setOpenBoardId(openBoardId === board.id ? null : board.id)}
                        onUpdate={handleBoardUpdate}
                    />
                ))}
            </div>
        </div>
    );
};

