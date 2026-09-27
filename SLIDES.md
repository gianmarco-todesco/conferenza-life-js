# Life, il gioco della vita — elenco delle slide

Documento di lavoro: per ogni slide c'è **cosa faceva** la versione Qt
(`conferenze/Life2023`), una **proposta** per ripensarla e le **domande aperte**.
Le proposte sono mie e sono da discutere; quello che decidiamo sostituisce la proposta.

Stato di ogni slide: `da definire` → `definita` → `implementata` → `provata`.

## Convenzioni comuni (approvate)

Valgono per tutte le slide, così in sala non bisogna ricordarsi i tasti di ognuna.

| Tasto | Effetto |
|---|---|
| PageDown / PageUp, ↓ / ↑ | slide successiva / precedente (il telecomando manda PageUp/PageDown) |
| → / ← | passo successivo / precedente *dentro* la slide |
| 0 | torna al primo passo della slide |
| Invio | avvia / ferma l'animazione |
| Spazio | una sola generazione |
| + / − | più veloce / più lento |
| F | schermo intero |

I tasti F5–F8 dell'originale non si possono usare: nel browser F5 ricarica la pagina.
Ogni altro tasto è della slide e va documentato nella sua scheda. L'URL porta slide e
passo (`#golrule/3`), così dopo un ricaricamento si torna esattamente lì.

Lo stile visivo di partenza è quello dell'originale: fondo grigio-azzurro
(`rgb(100,120,130)`), celle bianche con il bordo scuro, celle che nascono e muoiono
**sfumando** invece di scattare.

## Il percorso

L'ordine è quello dell'originale, raggruppato per capitoli dedotti dalle slide:

| # | Capitolo | Slide | Tipo | Stato |
|---|---|---|---|---|
| 1 | Apertura | [title](#1-title) | animazione | implementata |
| 2 | Automi cellulari in natura | [bz-sim](#2-bz-sim) | simulazione | definita |
| 3 | | [bz-foto](#3-bz-foto) | immagine | implementata |
| 4 | | [rule30](#4-rule30) | animazione | implementata |
| 5 | | [conchiglie](#5-conchiglie) | immagini | implementata |
| 6 | | [regel30](#6-regel30) | immagini | implementata |
| 7 | Life nell'arte | [life-arte](#7-life-arte) | immagini | implementata |
| 8 | Conway | [conway](#8-conway) | immagini | implementata |
| 9 | Le regole | [golrule](#9-golrule) | simulazione | implementata |
| 10 | | [glider](#10-glider) | immagini | implementata |
| 11 | Life come computer | [porta-and](#11-porta-and) | simulazione | definita |
| 12 | Potenza di calcolo | [macchine](#12-macchine) | immagini | implementata |
| 13 | Hashlife | [cannone-p416](#13-cannone-p416) | hashlife | definita |
| 14 | | [life-in-life](#14-life-in-life) | hashlife | definita |
| 15 | | [ticker](#15-ticker) | hashlife | definita |

Restano fuori, per ora: la slide 0 dell'originale (il `GlLifeViewer` vuoto),
`DrostePage`, `Viewer3/4`. Tolta: la slide dei credits. Il generatore del ticker non è
una slide ma diventa uno strumento (vedi la scheda del ticker).

**Le immagini sono piccole** (al massimo 1024×768, alcune 300–500 px) e il palco è
1920×1080: a tutto schermo si vedranno sgranate. Dove esiste una fonte migliore conviene
sostituirle. GMT cercherà versioni a risoluzione più alta, non subito.

---

## 1. title

**Originale** (`TitlePage`). Una griglia di Life con 8 copie di un motivo 9×9, ognuna
fatta avanzare di un numero diverso di generazioni. Scritte sopra: "LIFE",
"Il gioco della vita", "John Conway, 1970", "Gian Marco Todesco",
"gianmarco.todesco@gmail.com". Invio avvia e ferma, +/− cambiano la velocità, `S` ferma
alla prossima generazione di fase 4 (mod 8): un modo per fermarsi su un fotogramma bello.
Le celle si possono modificare col mouse anche nel titolo.

Il motivo 9×9 è la **galassia di Kok**, un oscillatore di periodo 8 (verificato
facendolo girare): il titolo ne mostra 8 copie, una per fase. È la stessa figura della
slide finale, la galassia fatta di metapixel, quindi il titolo anticipa il finale.

**Decisione.** Resta quasi identica all'originale. Titolo ed email non cambiano.

## 2. bz-sim

**Originale** (`BZReactionPage`). Automa cellulare 300×300 che imita la reazione di
Belousov-Zhabotinsky (modello "hodgepodge", q=210, k1=k2=3, g=28), colorato con una
tavolozza. Invio avvia e ferma, Canc ricomincia dal seme 17. I tasti +/− nel codice
sono commentati: servivano a cercare un buon seme casuale.

**Decisioni.**
- La fusione con la foto (slide seguente) va provata: GMT vuole prima vedere come viene.
  Si implementano le due slide separate, e la fusione si prova come variante.
- Niente interazione col mouse, per ora.
- La risoluzione si può alzare, per esempio a 480×270 celle.

## 3. bz-foto

**Originale.** `bz.png`, didascalia "Belousov-Zhabotinsky reaction".

Vedi la slide precedente per la fusione con la simulazione.

## 4. rule30

**Il racconto (GMT).** Automa cellulare unidimensionale: ogni cella è viva (1) o morta
(0), e il suo valore successivo dipende da lei e dai due vicini. Una regola è una mappa
dalle 8 configurazioni di 3 bit al bit successivo, quindi le regole possibili sono 256,
numerate da 0 a 255. Si mostra la regola 30, famosa perché la colonna centrale è quasi
casuale. Lo schermo usa le due dimensioni: verso il basso scorre il tempo.

1. In basso, la regola: le 8 configurazioni con il loro risultato.
2. In alto, una riga di celle tutte spente, salvo quella centrale.
3. Una finestrella di tre celle scorre lungo la riga. A ogni posizione si evidenzia in
   basso la configurazione applicata e compare una cella nuova, viva o morta: si compone
   una seconda riga.
4. La riga nuova sale e si salda alla precedente. Il processo si ripete per la seconda e
   la terza riga.
5. Poi si va più in fretta: a ogni passo compare tutta la riga nuova, già attaccata alla
   precedente.
6. Con zoom e pan si segue l'evoluzione quando le righe diventano lunghe e compaiono
   triangoli di tutte le dimensioni.

**Come lo faceva il codice Qt** (`Rule30Page.cpp`, ricostruito):

- *Scala*: 20 px per cella; la riga corrente è al centro dello schermo.
- *Colori*: acceso arancione `rgb(231,138,25)`, spento bianco, su fondo grigio-azzurro.
- *Regola*: in fondo allo schermo, le 8 terne da sinistra a destra `111, 110, … 000`
  (l'ordine di Wolfram), ciascuna con il risultato 3 celle sotto e un triangolo bianco
  in mezzo, che punta verso il basso. Il triangolo della terna in uso si riempie di
  bianco. Sopra ogni cella della terna e sotto il risultato c'erano le etichette 0/1
  (nel porting sono rotte).
- *Riga corrente*: una striscia di 100 celle con i bordi (le spente sono bianche).
- *Riga nuova*: 3 celle più sotto, costruita da sinistra fino alla posizione corrente. La
  finestrella è un triangolo bianco fra le due righe: la base copre le 3 celle sopra, la
  punta indica la cella nuova.
- *Righe passate*: sopra la corrente, senza bordi, larghe solo quanto serve (ogni riga
  cresce di una cella per lato). Il triangolo si staglia quindi sul fondo.
- *La riga più recente resta ferma e le vecchie salgono*: il triangolo cresce verso
  l'alto.

I passi, con i tasti originali:

| Tasto | Cosa fa |
|---|---|
| `1` (prima volta) | la finestrella parte da sinistra e scorre veloce sulle celle spente, fino alla prima terna diversa da `000` |
| `1` (le volte dopo) | avanza di una cella: è il passo "manuale", commentato |
| `2` | completa la riga di corsa (3 celle per fotogramma), la fa salire e saldare, poi riparte da sola fino alla prima terna non nulla della riga dopo |
| `3` | come `2`, ma dopo la saldatura non riparte |
| `Invio` | fase veloce: aggiunge una riga intera, sparisce l'apparato della finestrella, e la vista scende di 10 px per riga (fino a 200 px) |
| `↓` | aggiunge una riga senza animazione |
| `0` | ricomincia |
| trascinamento col sinistro | zoom attorno al centro; il pan era calcolato ma non usato |

Le animazioni andavano per fotogramma, non per tempo.

**Decisioni (GMT, 2026-09-27).**

1. Verso della crescita come nel vecchio: la riga in costruzione resta ferma e le righe
   passate salgono, quindi il triangolo cresce verso l'alto.
2. Nella fase manuale Spazio avanza di una cella e → completa la riga e la salda. Lo
   scorrimento sulle celle spente è automatico.
3. Il passaggio alla fase veloce è automatico.
4. Nella fase veloce si aggiunge una riga per passo.
5. Zoom e pan liberi, più il comando "mostra tutto".
6. La numerazione non è ancora decisa: si mette tutto, e dopo si decide cosa togliere.
7. La colonna centrale non si evidenzia.
8. Si arriva a circa 100 righe: abbastanza per vedere i triangoli rovesciati di tutte
   le dimensioni.

**Specifica della slide nuova.**

*All'ingresso:*
- La regola in fondo, con le etichette 0/1.
- La riga iniziale (una sola cella accesa) con i bordi, al centro dello schermo.
- Sotto, il posto vuoto della riga nuova.

*Fase manuale* (costruzione della seconda e della terza riga):
- Il primo Spazio fa comparire la finestrella a sinistra. La finestrella scorre da sola,
  veloce, sulle celle spente, e si ferma sulla prima terna diversa da `000`.
- Ogni Spazio successivo avanza di una cella. La cella nuova compare e in basso si
  evidenzia la terna usata.
- → completa la riga di corsa, poi la riga sale e si salda alla precedente. La
  finestrella riparte da sola sulla riga dopo, fino alla prima terna interessante.
- Dopo la saldatura della terza riga si passa da soli alla fase veloce.

*Fase veloce:*
- La finestrella e la riga in costruzione spariscono.
- Spazio o → aggiungono una riga intera, già saldata.
- La vista scende un poco a ogni riga, come nel vecchio (10 px per riga, fino a 200 px).
- Si va avanti fino a circa 100 righe.

*Sempre attivi:*

| Tasto | Effetto |
|---|---|
| ← | torna allo stato della riga precedente |
| `0` | ricomincia |
| `T` | mostra tutto: la vista si adatta al triangolo, con una transizione animata |
| rotella | zoom attorno al cursore |
| trascinamento | pan |
| `L` | mostra e nasconde le etichette 0/1 della regola; all'ingresso sono visibili |
| `N` | mostra e nasconde la lettura della regola come numero, `00011110 = 30`: le uscite delle 8 terne in fila, sotto la regola; all'ingresso è nascosta |

`L` e `N` sono interruttori e non passi, così togliere l'uno o l'altro non sposta la
sequenza. Le animazioni vanno a tempo, non a fotogrammi.

**Note sull'implementazione** (`js/life/rule30.js` per la macchina a stati, testata in
`tests/run.mjs`; `js/slides/rule30.js` per il disegno):
- La finestrella è una cornice scura sulle tre celle, più il triangolo bianco che punta
  alla cella nuova: la cornice non c'era nell'originale.
- I posti ancora vuoti della riga nuova si vedono come contorni tenui.
- La lettura come numero (`N`) sta **a destra** della regola, non sotto: sotto non c'è
  spazio. Ogni cifra ha il colore della sua cella.
- Dietro la regola c'è una fascia semitrasparente, così un triangolo ingrandito non ci si
  sovrappone.
- Il passo corrente dentro la slide (riga, cella) non finisce nell'URL: ricaricando si
  riparte dall'inizio della slide.

## 5. conchiglie

**Originale.** `shell.png` ("Conus textile") e `shell2.png` ("Marco Schutzmann").

**Decisione.** Due passi, una foto per passo. La Conus textile resta da sola, senza il
triangolo di regola 30 sovrapposto.

## 6. regel30

**Originale.** `regel30.png` ("Regel 30, Kristoffer Myskja", la macchina che disegna
regola 30 su un rotolo di carta) e `wolfrule30.png`, un intarsio a motivo di regola 30.

**Aperto.** L'autore di `wolfrule30.png` lo cerca GMT; per ora resta senza didascalia.

## 7. life-arte

**Originale.** Quattro immagini:

| Immagine | Didascalia originale |
|---|---|
| `gameofspace.png` | "Game of Space, Hiroshima MOCA" |
| `gol_hw.png` | *(nessuna)*: Life in hardware, pannello di lampadine |
| `cloth1.jpg` | *(nessuna)*: abito con Life a LED |
| `russell.jpg` | "Game of Life by Rose Lewenstein at The Yard, 2012" |

**Decisione.** Una slide a galleria, un'immagine per passo, con le didascalie che
mancano.

**Aperto.** Gli autori di `gol_hw` e `cloth1` li cerca GMT; per ora restano senza
didascalia.

## 8. conway

**Originale.** `Conway_1k.jpg` ("John Horton Conway") e `conway_tongue.png`.

**Decisione.** Due passi. La didascalia diventa "John Horton Conway (1937–2020)".

## 9. golrule

**Originale** (`GolRulePage`, la prima delle due). Life su una griglia visibile, con le
celle che nascono e muoiono sfumando. Si disegna col mouse (E/P per passare dal disegno
allo spostamento), Spazio fa una generazione, Invio avvia, R riempie a caso, Canc
svuota, G nasconde la griglia.

**Decisione.** È la slide in cui si spiegano le regole, quindi va a passi:
1. griglia vuota, si disegna;
2. su una generazione, i vicini **contati** e scritti nelle celle, le nascite in verde e
   le morti in rosso, prima di applicarle;
3. la collezione dei primi pattern: blocco, blinker, glider, R-pentomino;
4. Life libero.

In tutti i passi si disegna col mouse, e restano i tasti dell'originale: R riempie a
caso, Canc svuota, G mostra e nasconde la griglia.

**Note sull'implementazione** (`js/slides/golrule.js`):
- Passo 1: in alto compare la regola in due righe ("Una cella viva con 2 o 3 vicini
  sopravvive, altrimenti muore. Una cella vuota con esattamente 3 vicini nasce.").
  Se nel passo 0 non si è disegnato niente, compare un glider da contare. I numeri
  aspettano la fine della sfumatura.
- Passo 2: ogni → aggiunge un pattern (blocco, blinker, glider, R-pentomino) con il
  nome sotto. Il glider va in alto a sinistra, lontano dai detriti dell'R-pentomino. I
  nomi svaniscono dopo 20 generazioni, prima che i detriti li coprano.
- Passo 3: riempimento casuale se ci si arriva da un ricaricamento, altrimenti restano
  le celle del passo 2.
- Andando avanti le celle restano; andando indietro, o ricaricando, il passo riparte
  dal suo stato iniziale.
- `e` scambia disegno e trascinamento sul tasto sinistro, per chi non ha il tasto
  destro (trackpad). Velocità: 0,5 – 60 generazioni al secondo.

## 10. glider

**Originale.** `tshirt.png` (il glider come emblema hacker) e `engraved_glider.jpg`.

**Decisione.** Una slide con due passi.

## 11. porta-and

**Il racconto (GMT).** Si arriva qui subito dopo il cannone di Gosper; prima dell'AND
può servire uno schema con due flussi di glider che si incontrano e si annichilano.

Nella porta AND:
- Due flussi paralleli di glider arrivano dall'alto a sinistra e vanno in basso a
  destra. I cannoni che li generano non si vedono: sono subito fuori dell'inquadratura.
- Con un tasto compaiono due strisce semitrasparenti, i canali. Con `A` e `B` si
  interrompe e si riprende ciascun flusso; il canale è verdino se il flusso è attivo,
  rosso se non lo è.
- Un flusso trasversale va dall'alto a destra verso il basso a sinistra.
- Se i due flussi sono attivi, quello di destra incontra il trasversale, i glider si
  annichilano, e il flusso di sinistra arriva al ricevitore.
- Se il flusso di sinistra è spento, al ricevitore non arriva niente.
- Se il flusso di destra è spento, il trasversale incontra quello di sinistra e al
  ricevitore non arriva niente.

**Come lo faceva il codice Qt** (`GolRulePage.cpp`). L'ho ricostruito facendo girare la
scena in un simulatore Python.

*Le tre scene* (coordinate del mondo, y verso l'alto):

| Tasto | Scena |
|---|---|
| `1` | il cannone di Gosper da solo, una generazione per fotogramma |
| `2` | `createGliderCross`: un cannone che spara in basso a destra (a `(-103,1)`) e uno che spara in basso a sinistra (a `(-50,0)`). I due flussi si incontrano e si annichilano: **è già lo schema che proponi** |
| `3` | `createAndGate`, 5 generazioni per fotogramma |

*La porta AND del codice è diversa da come la ricordi:*
- I cannoni **visibili** sono tre, in fila in alto.
  - `r_gun` a sinistra spara in basso a destra il flusso **C**, che è quello che arriva
    al ricevitore.
  - `l_gun1` e `l_gun2` sparano in basso a sinistra: sono i due flussi **trasversali**,
    ciascuno con un eater in fondo.
- I flussi **A** e **B** non vengono da cannoni veri: il programma inietta un glider ogni
  30 generazioni appena sopra il bordo della finestra (a `(-95,40)` e `(-45,40)`). Si
  accendono e si spengono con i tasti `A` e `B`.
- A e B annichilano i trasversali appena escono dai loro cannoni:
  - A attivo fa sparire il trasversale di `l_gun1`;
  - B attivo fa sparire quello di `l_gun2`.
- Il flusso C incrocia entrambi i trasversali, quindi arriva al ricevitore solo se tutti
  e due sono stati tolti di mezzo, cioè solo se A **e** B sono attivi.
- In pratica sono due invertitori in serie. Nella tua versione, invece, il segnale di
  uscita è il flusso A stesso e il trasversale è uno solo.

*Canali e sensori:*
- Il tasto `C` mostra tre strisce semitrasparenti, A, B e C, e `N` mostra le etichette.
- Il colore non dipende dal tasto premuto: ogni canale ha un **sensore**, una cella
  lungo la striscia. Il canale è verde se ci è passato un glider negli ultimi 10
  fotogrammi, rosso altrimenti. Il colore dice quindi cosa succede davvero, compreso se
  al ricevitore arriva qualcosa, con il ritardo del viaggio dei glider.
- Un **ricevitore** vero e proprio non c'è: c'è il canale C con il suo sensore, e un
  eater fuori dell'inquadratura che mangia i glider in uscita.

`V`, `+` e `−` cambiano la velocità. Nel codice c'è anche una versione precedente,
morta: la scena `0x80` con le "porte" d'ingresso e d'uscita disegnate come quadratini.

**Decisioni (GMT, 2026-09-27).**

1. Si fa la porta **del racconto**: due flussi paralleli A (sinistra) e B (destra) in
   basso a destra, un solo flusso trasversale T in basso a sinistra. T incontra prima
   B; se B c'è, T sparisce e A arriva al ricevitore; se B non c'è, T annichila A.
2. Gli ingressi sono **cannoni veri** fuori dell'inquadratura. Per spegnere un flusso si
   mette un eater davanti al suo cannone, e per riaccenderlo lo si toglie.
3. Il ricevitore è un eater con accanto una **lampadina** che si accende quando arriva un
   glider. A lato c'è la **tavola di verità** di AND, con la riga corrente evidenziata.
4. I passi sono quattro:
   1. il cannone di Gosper;
   2. due flussi che si annichilano;
   3. la porta AND con A e B attivi;
   4. compaiono i canali, con le etichette.

   `A` e `B` accendono e spengono i flussi **in qualunque momento**.
5. Il colore dei canali lo decide il **sensore**, come nel vecchio.

**Lavoro tecnico da fare in implementazione** (col simulatore, prima di scrivere la
slide):
- Trovare posizioni e fasi dei tre cannoni per cui B e T, e A e T, si annichilano
  **puliti**, senza detriti, a ogni periodo (30 generazioni).
- Mettere un eater in fondo a ogni flusso che esce dall'inquadratura.
- Mettere e togliere l'eater-interruttore solo nella fase in cui nessun glider gli si
  sovrappone, altrimenti restano detriti.
- La tavola di verità deve seguire i sensori, non i tasti: la riga evidenziata è quella
  dello stato che i glider hanno raggiunto davvero.

## 12. macchine

**Originale.** `rise_of_machines.png` e `rise_of_machines2.jpg`, il grafico della
potenza di calcolo nel tempo (la seconda con il Cray e l'iPad), e `gollys.png`
(schermata di Golly).

**Decisione.** Tre passi: le due immagini del grafico, poi Golly. Golly resta perché
GMT vuole raccontare che il programma esiste, e che intorno c'è una comunità.

## 13. cannone-p416

**Originale** (`GlLifeViewer`, tasto 1). `2c5-spaceship-gun-p416.rle` con hashlife.

**Ruolo nel racconto (GMT).** È il primo schema davvero complicato e affascinante. Guida
la transizione dagli schemi semplicissimi visti prima a quelli assurdamente complicati
che seguono.

**Il visualizzatore hashlife**, comune alle ultime tre slide:
- pan e zoom col mouse;
- contatore delle generazioni;
- velocità a passi con + / −: 1, 10, 100, 4000… generazioni per fotogramma.

## 14. life-in-life

**Originale** (`GlLifeViewer`, tasto 2). `metapixel-galaxy.mc`: una galassia di Kok
fatta di metapixel OTCA, cioè Life simulato da Life. Si fermava da sola a 39000
generazioni: le metacelle hanno periodo 35328.

**Ruolo del blocco (GMT).** Il blocco non è un limite. Serve a sincronizzarsi con il
cambio di colore di una metacella, per far vedere le ultime fasi del processo. Dopo si
vuole andare oltre.

**Specifica.**
- Si va avanti senza limite.
- `S` corre fino al prossimo **punto di sincronia** e lì si ferma. I punti di sincronia
  sono le generazioni 39000 + k·35328, cioè lo stesso istante del ciclo di ogni
  metacella. Il valore 39000 va ricontrollato sul pattern.
- Invio riparte da dove ci si è fermati.

**Proposta** (da provare):
- Lo zoom è il racconto. I passi → portano la vista dalle celle a una metacella intera e
  poi a tutta la galassia, con transizioni animate.
- Da lontano, livelli di grigio proporzionali alla popolazione invece del pixel pieno.

## 15. ticker

**Originale** (`GlLifeViewer`, tasto 3). `ticker.rle`: una scritta che scorre, fatta
di glider, generata a partire da `pescara.png` (la scritta di una vecchia edizione).
Il generatore è `loadTicker_old` in `GlLifeViewer.cpp`: una fila di cannoni con
duplicatori, riflettori e convertitori glider→astronave, pilotati dai pixel
dell'immagine. `TickerPage` scrive il risultato in `data/ticker.rle`.

**Decisione.** Serve un **generatore in JS**, perché a ogni conferenza GMT vuole
rigenerare il ticker con un'immagine o una scritta adatta a chi lo ha invitato.

- È uno strumento a parte, non una slide: una pagina `tools/ticker.html`.
- Riceve una scritta, da rendere in bitmap con un font, oppure un'immagine a una riga di
  pixel per cannone.
- Produce un `.rle` (o `.mc`) che la slide carica.
- Prima di riscriverlo va capito bene `loadTicker_old`, compreso il codice commentato
  che sembra una seconda versione.

