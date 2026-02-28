
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/store';
import { Stripboard, Scene, Project, ProductionElement } from '../types';
import { Button } from '../components/Button';
import { PlanAccordionItem } from '../components/PlanAccordionItem';
import { ConfirmationModal } from '../components/ConfirmationModal';

export const StripboardView: React.FC = () => {
    const navigate = useNavigate();
    const [boards, setBoards] = useState<Stripboard[]>([]);
    const [scenes, setScenes] = useState<Record<string, Scene>>({});
    const [elements, setElements] = useState<ProductionElement[]>([]);
    const [loading, setLoading] = useState(true);
    const [openBoardId, setOpenBoardId] = useState<string | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [boardToDelete, setBoardToDelete] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const pid = localStorage.getItem('currentProjectId');
        if (!pid) return navigate('/projects');

        try {
            const [fetchedBoards, projectScenes, projects, projectElements] = await Promise.all([
                db.getStripboards(pid),
                db.getProjectScenes(pid),
                db.getProjects(),
                db.getElements(pid)
            ]);
            
            const currentProject = projects.find(p => p.id === pid) || null;
            setProject(currentProject);

            const sceneMap: Record<string, Scene> = {};
            projectScenes.forEach(s => sceneMap[s.id] = s);
            setScenes(sceneMap);
            setBoards(fetchedBoards);
            setElements(projectElements);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleBoardUpdate = (updatedBoard: Stripboard) => {
        setBoards(prev => prev.map(b => b.id === updatedBoard.id ? updatedBoard : b));
    };

    const handleSceneUpdate = (updatedScene: Scene) => {
        setScenes(prev => ({
            ...prev,
            [updatedScene.id]: updatedScene
        }));
    };

    const handleDeleteRequest = (boardId: string) => {
        setBoardToDelete(boardId);
    };

    const handleElementDeleted = async (elementId: string) => {
        const pid = localStorage.getItem('currentProjectId');
        if (!pid) return;

        // Delete from DB
        await db.deleteElement(pid, elementId);

        // Update local state
        setElements(prev => prev.filter(e => e.id !== elementId));
        
        // Update local scenes state
        setScenes(prev => {
            const newScenes = { ...prev };
            Object.keys(newScenes).forEach(key => {
                const s = newScenes[key];
                if (s.elementIds && s.elementIds.includes(elementId)) {
                    newScenes[key] = {
                        ...s,
                        elementIds: s.elementIds.filter(id => id !== elementId)
                    };
                }
            });
            return newScenes;
        });
    };

    const confirmDelete = async () => {
        const pid = localStorage.getItem('currentProjectId');
        if (pid && boardToDelete) {
            console.log(`delete confirmed for board ${boardToDelete}`);
            await db.deleteStripboard(pid, boardToDelete);
            setBoards(prev => prev.filter(b => b.id !== boardToDelete));
            setBoardToDelete(null);
        }
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
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Nessun Piano di Lavorazione</h2>
                    <p className="text-gray-500 dark:text-gray-400">Importa una sceneggiatura per generare il primo piano.</p>
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
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                   <span>{project?.name || 'Progetto'}</span>
                   <i className="fa-solid fa-chevron-right text-[10px]"></i>
                   <span className="text-gray-900 dark:text-white font-bold uppercase tracking-wider">PDL</span>
                </div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Piani di Lavorazione</h1>
                <p className="text-gray-500 dark:text-gray-400">Gestisci i tuoi piani e ottimizza le giornate di ripresa.</p>
            </header>

            <div className="flex-1 overflow-y-auto space-y-4 pb-20 no-scrollbar">
                {boards.map(board => (
                    <PlanAccordionItem
                        key={board.id}
                        board={board}
                        scenes={scenes}
                        elements={elements}
                        isOpen={openBoardId === board.id}
                        onToggle={() => setOpenBoardId(openBoardId === board.id ? null : board.id)}
                        onUpdate={handleBoardUpdate}
                        onSceneUpdate={handleSceneUpdate}
                        onDelete={() => handleDeleteRequest(board.id)}
                        onElementDeleted={handleElementDeleted}
                        projectName={project?.name}
                        project={project || undefined}
                    />
                ))}
            </div>

            <ConfirmationModal
                isOpen={!!boardToDelete}
                title="Attenzione"
                message="Stai per cancellare definitivamente questo piano di lavorazione. Vuoi continuare?"
                onConfirm={confirmDelete}
                onCancel={() => setBoardToDelete(null)}
            />
        </div>
    );
};

