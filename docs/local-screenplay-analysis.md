# Analisi locale delle sceneggiature

L'importazione PDF usa PDF.js e un parser TypeScript nel browser. Non richiede
chiavi API, non chiama modelli AI e non invia il PDF a un server. Il worker PDF.js
è incluso nel build; dopo il caricamento dell'app, l'analisi non richiede servizi
esterni. I dati del progetto restano nella memoria locale del browser.

## Formato e comportamento

- PDF con testo selezionabile, fino a 50 MB e 500 pagine. Le scansioni richiedono
  prima un OCR esterno; il programma lo segnala e non inventa risultati.
- Intestazioni italiane/inglesi, per esempio `12A INT. CUCINA - GIORNO 12A`,
  `EXT. STREET - NIGHT`, `INT./EST. AUTO - TRAMONTO`. Numerazione automatica se
  assente, gestione delle continuazioni e numeri duplicati segnalati.
- Nomi sopra i dialoghi, suffissi V.O./O.S., introduzioni con età e successive
  menzioni dei personaggi nelle azioni. Non vengono riconosciuti tutti i
  personaggi senza battute né tutte le varianti/alias dello stesso nome.
- Dizionario italiano/inglese per attrezzeria, veicoli, animali, costumi,
  trucco, comparse, effetti, stunt, musica e suono. Corrispondenze solo nelle
  descrizioni d'azione, non negli oggetti citati solo nei dialoghi.
- Testo originale conservato per ogni scena e sinossi estrattiva. Gli ottavi
  sono stime dell'altezza occupata nelle pagine, non misure certificate.
- Orari assenti o relativi usano GIORNO provvisorio con avviso. Set e location
  derivano dalla stessa intestazione, non da luoghi reali di ripresa verificati.

Lo spoglio è una base modificabile da revisionare: parole ambigue, negazioni,
metafore, oggetti non presenti nel dizionario, azioni implicite e impaginazioni
non standard possono produrre omissioni o falsi positivi. Nessuna promessa di
estrazione semantica completa. L'anteprima mostra scene, elementi, testo e avvisi.

Importare in un progetto già popolato richiede conferma e sostituisce scene,
elementi e stripboard. Il salvataggio principale è atomico: un errore di quota
non sovrascrive parzialmente i dati precedenti. Esportare un backup prima di
sostituire uno spoglio già lavorato.

## Verifica

Con Node 22.13+ / 24 e le dipendenze installate:

```sh
node --experimental-transform-types --test services/screenplayParser.test.ts
npm run lint
npm run build
```

I test coprono intestazioni e numerazione, continuità tra pagine, nomi Unicode,
categorie compatibili con l'app, esclusione dei dialoghi, raggruppamento dei
frammenti PDF e rifiuto di documenti non riconoscibili. Verificare anche nel
browser il percorso PDF -> anteprima -> creazione progetto -> scene/elementi
salvati -> ricaricamento, e che non partano richieste verso provider AI.
