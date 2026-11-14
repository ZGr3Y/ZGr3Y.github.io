# Unicorno: verifica della costruzione e dell'apertura

**Decisione successiva dell'utente (12 novembre):** per l'implementazione è approvata una costruzione scenica originale. La silhouette nella vista principale resta fedele alla foto; apertura e chiusura devono apparire come carta piegata, ma non è richiesta la correttezza fisica della piegatura. Le due superfici persistenti, i lembi e il corno separato sono ora animati in `src/acts/CinematicUnicorn.prototype.js`. La verifica rigorosa documentata sotto resta uno studio dell'approccio precedente e non blocca questa direzione approvata.

Ricerca del 12 novembre 2026. Ambito: fonti di costruzione e limiti della loro evidenza; nessuna modifica alla scena o agli asset di produzione.

**Esito:** i diagrammi di Kenneth Thompson documentano una costruzione concreta da due quadrati, ma prevedono un taglio e incollaggi. Non dimostrano ancora una variante da due fogli integri capace di conservare la sagoma richiesta e aprirsi senza intersezioni. Conservare la punta ripiegandola è un'ipotesi da verificare, non una soluzione già validata. [T-A](https://geekydadcrafts.com/wp-content/uploads/2019/01/Unicorn-A.jpg), [T-B](https://geekydadcrafts.com/wp-content/uploads/2019/01/Unicorn-B.jpg), [T-D](https://geekydadcrafts.com/wp-content/uploads/2019/01/Unicorn-D.jpg).

## Requisiti concordati

- Unicorno realmente tridimensionale; dalla camera scelta deve rispettare sagoma, proporzioni e pieghe principali della fotografia argento Blade Runner.
- Uno o due quadrati/rettangoli integri, senza allungamento; flessione locale della carta consentita, attraversamento della carta escluso. All'apertura i fogli si affiancano bordo contro bordo formando una pagina visiva unica.
- Due metà unite nello stato chiuso; piccola separazione consentita soltanto durante l'apertura. Oggetto già sospeso; movimento preparato di quattro secondi.
- Esterno argento, interno avorio stampato. Corno rigido separato consentito esplicitamente; deve finire fisicamente dietro la pagina, con occlusione verificabile.

Questi sono vincoli del progetto, non proprietà dimostrate dai tutorial.

## Cosa prescrive Thompson

Le tavole portano il nome **Kenneth Thompson**. Sono documenti dell'autore conservati su un mirror; il testo editoriale del mirror non è una dimostrazione delle proprietà geometriche. [T-A](https://geekydadcrafts.com/wp-content/uploads/2019/01/Unicorn-A.jpg).

| Passaggi | Evidenza leggibile nelle tavole | Conseguenza per questo progetto |
| --- | --- | --- |
| 1–10 | Due quadrati di 4½ pollici, argento su una faccia e bianchi sull'altra; forbici e colla. La stessa base viene preparata su entrambi; il passo 8 è una piega a petalo, ripetuta sull'altro lato al 9. | I due pezzi hanno un'origine rettangolare esplicita, ma la lista dei materiali non promette che rimangano integri. [T-A](https://geekydadcrafts.com/wp-content/uploads/2019/01/Unicorn-A.jpg). |
| 11–20, metà anteriore | Il 12 riguarda solo gli strati esterni anteriore e posteriore; il 14 apre e schiaccia una tasca; 15–17 sono pieghe inverse. Il **18 richiede di tagliare**; 19–20 modellano entrambe le zampe. | Non è una sequenza di rotazioni indipendenti di semplici pannelli esterni: servono identificazione degli strati e stati intermedi. [T-B](https://geekydadcrafts.com/wp-content/uploads/2019/01/Unicorn-B.jpg). |
| 21–29, metà posteriore | Il 23 richiede apertura e inversione interna/esterna; il 25 segna quattro strati ma ripiega soltanto quello anteriore e quello posteriore. Il 27 combina una piega interna e una inversa esterna; il 28 va ripetuto sull'altra zampa. Non compare un'ulteriore istruzione di taglio. | La tavola offre una sequenza costruttiva della metà posteriore, non coordinate o traiettorie di tutti gli strati. [T-C](https://geekydadcrafts.com/wp-content/uploads/2019/01/Unicorn-C.jpg). |
| 30–32, montaggio | Il 30 riapre il ritaglio più grande del 18; il 31 lo forma in cono e lo torce. Il 32 prevede incastro e colla tra le metà e colla per il corno; raccomanda prima un montaggio a secco. | Il corno originale deriva da materiale sottratto al primo quadrato. Il collegamento del corpo mostrato è un innesto con sovrapposizione, diverso dall'affiancamento finale dei fogli richiesto qui. [T-D](https://geekydadcrafts.com/wp-content/uploads/2019/01/Unicorn-D.jpg). |

### Il punto non risolto: sostituire il taglio 18 con una piega

**Osservazione diretta:** nel passo 18 sono disegnati tratti rossi tratteggiati con le lettere `a` e `b`. Uno attraversa la linguetta lunga a sinistra; l'altro è vicino al suo contorno obliquo superiore. La figura non riporta la mappa del taglio sul quadrato aperto, né identifica tutte le facce attraversate. Il riferimento al ritaglio più grande nella tavola D non risolve queste ambiguità. Non dedurre dal solo raster né una singola cerniera certa né due tagli indipendenti certi. [T-B](https://geekydadcrafts.com/wp-content/uploads/2019/01/Unicorn-B.jpg), [T-D](https://geekydadcrafts.com/wp-content/uploads/2019/01/Unicorn-D.jpg).

**Deduzione geometrica condizionale:** se tutto il materiale da conservare fosse collegato al resto soltanto lungo un unico asse rettilineo nello stato considerato, una rotazione attorno a quell'asse ne conserverebbe lunghezze e area. Questo verifica una possibile operazione locale. Non prova che il materiale sia davvero collegato così, che la rotazione sia libera da collisioni, o che il pacco ripiegato resti nascosto e lasci praticabili i passi 19–20 e l'innesto 32.

Per verificare la variante occorre prima ricostruire il foglio fino al 17 senza tagli, tracciare su ogni strato la regione interessata dal 18 e conservarla esplicitamente. Vanno poi dimostrati insieme: piega di occultamento, completamento delle zampe, montaggio delle due metà, sagoma dalla camera e apertura inversa fino ai due quadrati. Un corno separato elimina la necessità di ricavare il corno dal ritaglio; non elimina la carta eccedente dal corpo.

### Video originali: rintracciati, non visionati

L'HTML del mirror conserva quattro collegamenti `.mov` per [base 1–10](http://bladerunnerunicorn.com/Media/Unicorn%20instructions%20Steps%201-10.mov), [anteriore 11–20](http://bladerunnerunicorn.com/Media/Front%20Side%20Steps%2011-20.mov), [posteriore](http://bladerunnerunicorn.com/Media/Rear%20of%20Unicorn.mov) e [montaggio](http://bladerunnerunicorn.com/Media/Unicorn%20Assembly.mov). In questa ricerca il filmato anteriore non è risultato accessibile; non è stato verificato fotogramma per fotogramma. Il dominio principale restituisce oggi contenuti estranei all'origami. Non attribuire al video una conferma del taglio, degli strati o della variante. [Indice del mirror](https://geekydadcrafts.com/2019/01/10/the-blade-runner-unicorn/), [dominio verificato](https://bladerunnerunicorn.com/).

## Alternativa documentata: Jo Nakashima

L'autore pubblica un proprio unicorno, versione 2019 del progetto 2014, con sette tavole e un [video](https://www.youtube.com/watch?v=ESrZdja1jdA). Specifica carta quadrata da 20 × 20 cm nel tutorial e 24 × 24 cm per il primo esemplare. Spiega di aver aggiunto blocchi alle zampe e al corpo e riordinato gli strati della piega del collo per evitare l'apertura spontanea. Avverte inoltre che alcune transizioni dei diagrammi richiedono il video. [Pagina dell'autore](https://jonakashima.com.br/2019/11/25/origami-unicorn/).

È una fonte costruttiva alternativa da esaminare, non una variante Thompson già approvata. Questa ricerca non ha potuto ispezionare integralmente le sette immagini né il filmato: i download delle immagini sono falliti per risoluzione DNS. Pertanto non certifica da sola l'assenza di tagli, l'apertura inversa o la corrispondenza alla fotografia. Non cambiare il modello estetico concordato sulla sola base della disponibilità di un tutorial.

## Dati geometrici, simulazione e prova sono cose diverse

La specifica **FOLD 1.2** definisce coordinate, adiacenze, facce, assegnazioni delle pieghe e angoli in gradi: positivo per valle, negativo per monte. Può conservare più stati e un ordine tra facce sovrapposte. `C` rappresenta un taglio, da trattare come bordi separati; `J` è un bordo di modellazione tra facce da considerare una sola faccia, **non** un comando per incollare fisicamente i due fogli. I frame multipli sono opzionali per i programmi lettori. Il formato fornisce dati; un file valido non certifica un percorso. [Specifica degli autori](https://github.com/edemaine/fold/blob/main/doc/spec.md).

Origami Simulator dichiara di cercare una piegatura simultanea delle pieghe anziché eseguire una sequenza manuale. Usa vincoli elastici e mostra l'errore delle distanze rispetto a quelle del foglio. Serve a esplorare una configurazione, ma una deformazione piccola non equivale a deformazione nulla. Il lavoro scientifico del 2018 menziona il rilevamento delle collisioni fra gli sviluppi futuri: questo dato storico non certifica le capacità della versione corrente, e soprattutto non certifica un'apertura del nostro unicorno. [Documentazione del simulatore](https://origamisimulator.org/), [paper degli autori, §5](https://erikdemaine.org/papers/OrigamiSimulator_Origami7/paper.pdf).

**Criterio matematico del progetto:** conservare soltanto l'area non basta a escludere stiramento; per esempio, dilatare una direzione di fattore 2 e contrarre l'altra di ½ conserva l'area ma modifica le distanze. Conservare i tre lati di ciascun triangolo non degenere conserva invece la sua metrica e la sua area. Restano da verificare connessioni tra triangoli, chiusura dei cicli di pieghe, ordine degli strati e assenza di attraversamenti per tutto il movimento, non soltanto agli estremi. Contatto fra strati e attraversamento sono condizioni diverse.

Se esistesse una costruzione da fogli integri con un percorso continuo senza attraversamenti, ripercorrerla al contrario darebbe un'apertura valida. Questa deduzione non si applica automaticamente alla ricetta originale: taglio e incollaggi modificano materiale e collegamenti, mentre la variante che li sostituisce non è stata dimostrata.

## Verifica numerica eseguita

Script riproducibile: [`scripts/origami-step18-check.mjs`](../../scripts/origami-step18-check.mjs). Esecuzione dalla radice del repository:

```sh
node scripts/origami-step18-check.mjs
```

Genera una [scheda tecnica con cinque pose](../../public/prototypes/unicorn-construction-check.html) e i [dati JSON](../../public/prototypes/unicorn-construction-check.json). Non modifica il prototipo interattivo o la scena del portfolio. Il verdetto complessivo è `NOT_VALIDATED`.

### Che cosa viene modellato

Un triangolo che approssima la proiezione del lembo lungo e un contorno schematico del corpo nel passo 18. I punti sono letti dal raster della tavola B in pixel: **non sono coordinate del materiale, una ricostruzione del primo quadrato o una mappa degli strati**. Il triangolo è diviso lungo un asse ipotizzato; una porzione ruota rigidamente di 180° e l'altra resta ferma. La parte `b` e gli altri strati non sono ricostruiti.

### Risultati e limiti

| Controllo | Misura | Interpretazione |
| --- | --- | --- |
| Lunghezze del pannello, 721 angoli | Errore relativo massimo `1.55e-15` | La rotazione locale è numericamente isometrica. Analiticamente una rotazione conserva le distanze per ogni angolo, perché `RᵀR = I`. |
| Area del pannello | Errore relativo massimo `3.33e-15` | Nessun materiale è perso nel pannello schematico. |
| Punti dell'asse | Spostamento massimo `6.05e-14` pixel | La cerniera ipotizzata rimane attaccata. Non certifica gli altri attacchi del vero foglio. |
| Ingombro della porzione riflessa | Circa **3.6%** fuori dalla proiezione del corpo schematico | La piega scelta non nasconde interamente questa approssimazione. Non misura il modello fisico. |
| Asse traslato di ±1 pixel in x/y | Ingombro esterno **2.8–4.5%**, nove casi | Sensibilità alla lettura del raster. Non sono una ricerca esaustiva degli assi possibili o limiti d'errore garantiti. |
| Collisioni | Solo osservazione analitica locale | Nel modello ideale, un lembo piano che parte da un solo lato dell'asse resta fuori dal piano del corpo per angoli strettamente fra 0 e 180°. Agli estremi il contatto è consentito. Questo non riguarda gli strati sovrapposti, lo spessore, il resto del corpo o l'apertura completa. |

Il controllo separato della superficie del prototipo precedente misura 4.424 spigoli in 101 pose, usando la posizione aperta come metrica di riposo. L'errore relativo massimo dell'area è circa `2.87e-6`, ma quello della lunghezza degli spigoli arriva a `183.62`: lo spigolo peggiore diventa circa **184.6 volte** la propria lunghezza a foglio aperto. Lo script esclude per definizione eventuali spigoli a riposo inferiori a `1e-5` unità; in questa mesh non ne ha esclusi. Questo conferma che quel prototipo non può essere riutilizzato come costruzione inestensibile, anche se la sua area è quasi costante.

**Conclusione della verifica locale:** conservare un lembo con una cerniera è un'operazione matematica valida sotto le ipotesi indicate. Non sono stati verificati l'occultamento sul vero unicorno, la continuità dell'intero quadrato o il percorso inverso. Il risultato non autorizza a dichiarare risolta la costruzione e non dimostra un'impossibilità generale.

## Evidenza ancora necessaria prima di dichiarare il risultato fattibile

1. Mappa completa di pieghe, strati e materiale del primo quadrato, includendo la punta conservata; stesso tracciamento per il secondo quadrato.
2. Una sequenza 3D realmente eseguibile per pieghe a petalo, inverse e schiacciamenti, non un'interpolazione fra due mesh con distanze variabili.
3. Verifica di ogni foglio integro: bordo semplice rettangolare nello stato aperto, nessuna faccia perduta, lunghezze/angoli interni conservati entro tolleranze dichiarate; area come controllo aggiuntivo.
4. Controllo continuo delle collisioni e dell'ordine degli strati durante l'apertura delle due metà, lo sgancio e il loro avvicinamento bordo contro bordo. Il controllo di fotogrammi isolati è evidenza campionata, non prova dell'intero intervallo.
5. Confronto misurato dalla camera scelta su sagoma, proporzioni e pieghe principali; verifica fisica dell'occultamento del corno e leggibilità della faccia avorio stampata.

Nessuna delle fonti esaminate dimostra congiuntamente questi cinque punti per il modello richiesto. Non è stata dimostrata neppure un'impossibilità generale: il limite attuale è l'assenza di una costruzione completa verificata della variante.

## Fonti

- **T-A–T-D:** Kenneth Thompson, quattro tavole firmate: [base 1–10](https://geekydadcrafts.com/wp-content/uploads/2019/01/Unicorn-A.jpg), [anteriore 11–20](https://geekydadcrafts.com/wp-content/uploads/2019/01/Unicorn-B.jpg), [posteriore 21–29](https://geekydadcrafts.com/wp-content/uploads/2019/01/Unicorn-C.jpg), [montaggio 30–32](https://geekydadcrafts.com/wp-content/uploads/2019/01/Unicorn-D.jpg). Documenti primari consultati visivamente nelle copie raster; ospitati da un mirror.
- [GeekyDad Crafts, indice e collegamenti originali](https://geekydadcrafts.com/2019/01/10/the-blade-runner-unicorn/): utilizzato per rintracciare i documenti e i video, non come prova matematica o attribuzione del modello effettivamente usato nel film.
- [Jo Nakashima, Origami Unicorn](https://jonakashima.com.br/2019/11/25/origami-unicorn/): pagina dell'autore con istruzioni, motivazioni della revisione e limiti dichiarati dei diagrammi.
- [Erik Demaine e collaboratori, specifica FOLD](https://github.com/edemaine/fold/blob/main/doc/spec.md): formato dati, consultato nella versione 1.2.
- [Amanda Ghassaei e collaboratori, Origami Simulator](https://origamisimulator.org/) e [repository ufficiale](https://github.com/amandaghassaei/OrigamiSimulator): comportamento dichiarato e documentazione d'uso.
- [Ghassaei, Demaine, Gershenfeld, Fast, Interactive Origami Simulation using GPU Computation](https://erikdemaine.org/papers/OrigamiSimulator_Origami7/), 2018; [PDF, §5](https://erikdemaine.org/papers/OrigamiSimulator_Origami7/paper.pdf): metodo numerico e limiti storici.
