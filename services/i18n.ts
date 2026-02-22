import { useState, useEffect } from 'react';

type Language = 'it' | 'en';

const translations = {
  it: {
    // Layout
    nav_projects: 'Progetti',
    nav_script: 'Copione',
    nav_stripboard: 'Piano Lav.',
    nav_calendar: 'Calendario',
    
    // Dashboard
    welcome_back: 'Bentornato, Producer',
    new_btn: 'Nuovo',
    scenes: 'Scene',
    pages: 'Pagine',
    no_projects: 'Nessun progetto trovato. Crea il tuo primo progetto!',
    new_project_modal_title: 'Nuovo Progetto',
    project_name_label: 'Nome del Progetto',
    cancel: 'Annulla',
    create_project: 'Crea Progetto',
    delete_project_confirm: 'Eliminare progetto?\nQuesta azione elimina definitivamente il progetto e i dati associati.',
    
    // Settings
    settings_title: 'Impostazioni',
    dark_theme: 'Tema Scuro',
    light_theme: 'Tema Chiaro',
    language_label: 'Lingua',
    close: 'Chiudi',
    
    // Script Import
    import_title: 'Importa Sceneggiatura',
    import_subtitle: 'Pianificazione AI',
    start_analysis: 'Inizia Analisi',
    reset: 'Reset',
    go_to_pdl: 'Vai al PDL',
    no_file_selected: 'Nessun file selezionato',
    browse: 'SFOGLIA',
    or_divider: 'OPPURE',
    manual_creation_title: 'Creazione Manuale',
    manual_creation_desc: 'Non hai un PDF? Compila le scene manualmente.',
    create_new_pdl: 'Crea nuovo Piano di Lavorazione',
    
    // Plan Item
    days: 'Giorni',
    download_pdf: 'Scarica PDF',
    end_of_day: 'FINE GIORNO',
    delete_plan_confirm: 'Elimina definitivamente questo piano?',
    
    // Common
    save: 'Salva',
    edit: 'Modifica',
    delete: 'Elimina',
    cancel: 'Annulla',

    // Scene Editor
    edit_scene_title: 'Modifica Scena',
    slugline: 'Slugline',
    day_night: 'Giorno / Notte',
    real_location: 'Location Reale',
    synopsis: 'Sinossi',
    set_name_placeholder: 'Nome Set',

    // Print Setup
    print_settings_title: 'Impostazioni Stampa',
    project_title_header: 'Titolo Progetto (Header)',
    project_title_placeholder: 'Titolo del film',
    show_approx_time: 'Mostra orario approssimativo',
    day_labels_optional: 'Etichette Giorni (opzionale)',
    day_labels_desc: 'Lascia vuoto per usare default "Day 1", "Day 2"...'
  },
  en: {
    // Layout
    nav_projects: 'Projects',
    nav_script: 'Script',
    nav_stripboard: 'Stripboard',
    nav_calendar: 'Calendar',
    
    // Dashboard
    welcome_back: 'Welcome back, Producer',
    new_btn: 'New',
    scenes: 'Scenes',
    pages: 'Pages',
    no_projects: 'No projects found. Create your first project!',
    new_project_modal_title: 'New Project',
    project_name_label: 'Project Name',
    cancel: 'Cancel',
    create_project: 'Create Project',
    delete_project_confirm: 'Delete project?\nThis action permanently deletes the project and associated data.',
    
    // Settings
    settings_title: 'Settings',
    dark_theme: 'Dark Theme',
    light_theme: 'Light Theme',
    language_label: 'Language',
    close: 'Close',
    
    // Script Import
    import_title: 'Import Script',
    import_subtitle: 'AI Scheduling',
    start_analysis: 'Start Analysis',
    reset: 'Reset',
    go_to_pdl: 'Go to Stripboard',
    no_file_selected: 'No file selected',
    browse: 'BROWSE',
    or_divider: 'OR',
    manual_creation_title: 'Manual Creation',
    manual_creation_desc: "Don't have a PDF? Fill scenes manually.",
    create_new_pdl: 'Create new Stripboard',
    
    // Plan Item
    days: 'Days',
    download_pdf: 'Download PDF',
    end_of_day: 'END OF DAY',
    delete_plan_confirm: 'Permanently delete this plan?',
    
    // Common
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
    cancel: 'Cancel',

    // Scene Editor
    edit_scene_title: 'Edit Scene',
    slugline: 'Slugline',
    day_night: 'Day / Night',
    real_location: 'Real Location',
    synopsis: 'Synopsis',
    set_name_placeholder: 'Set Name',

    // Print Setup
    print_settings_title: 'Print Settings',
    project_title_header: 'Project Title (Header)',
    project_title_placeholder: 'Movie Title',
    show_approx_time: 'Show approximate time',
    day_labels_optional: 'Day Labels (optional)',
    day_labels_desc: 'Leave empty to use default "Day 1", "Day 2"...'
  }
};

export const useTranslation = () => {
  const [language, setLanguage] = useState<Language>('it');

  useEffect(() => {
    const updateLang = () => {
      const storedLang = localStorage.getItem('smartset_lang') as Language;
      if (storedLang) {
        setLanguage(storedLang);
      }
    };

    updateLang();
    window.addEventListener('language-change', updateLang);
    return () => window.removeEventListener('language-change', updateLang);
  }, []);

  const t = (key: keyof typeof translations['it']) => {
    return translations[language][key] || key;
  };

  return { t, language };
};
