# conferenza-life-js - istruzioni per Claude

Le slide della conferenza "Life, il gioco della vita" di Gian Marco Todesco, rifatte in
HTML/JavaScript a partire dalla versione C++/Qt in `../Life2023` (che non si porta più:
serve solo come riferimento per quello che le slide facevano).

**`SLIDES.md` è il documento di riferimento**: l'elenco delle slide, per ognuna cosa
faceva l'originale, le decisioni prese con GMT e lo stato
(`definita` → `implementata` → `provata`). Si aggiorna quando si decide qualcosa o si
completa una slide.

**`STATO-PROGETTO.md` è il documento di ripresa**: a che punto siamo, il prossimo passo,
cosa resta da guardare a schermo intero. Va aggiornato a fine sessione.

## Modo di lavorare

- Una slide per volta. **Un commit per ogni slide completata, e push** su `origin main`.
- Prima di implementare una slide la si ridiscute se la scheda lascia dubbi: GMT preferisce
  le domande alle sorprese.
- `provata` lo mette GMT, dopo averla vista a schermo intero.

## Costruire e provare

Niente build, niente npm, nessuna libreria esterna (per ora). Le slide sono moduli ES,
quindi serve un server:

```
python serve.py        ->  http://127.0.0.1:8766/
```

Il server disabilita la cache: un modulo importato da un altro modulo non è raggiunto da
nessun cache-busting sul tag `<script>`, e si proverebbe una versione vecchia senza
accorgersene.

L'URL porta slide e passo: `#rule30/3`. Ricaricando si torna lì.

I motori si provano senza browser: `node tests/run.mjs` (per questo c'è `package.json`
con `"type": "module"`, e nient'altro). Ogni comportamento non ovvio su cui una slide
conta ha un test lì.

## Struttura

```
index.html, css/stage.css   il palco 1920x1080, scalato alla finestra
js/main.js                  avvio
js/core/stage.js            palco, navigazione, passi, URL, input, ciclo di animazione
js/slides/index.js          l'ORDINE delle slide: una slide non ancora fatta non c'è
js/slides/*.js              una slide (o una famiglia di slide) per file
js/life/                    motori: Life semplice, hashlife
assets/images, assets/patterns
tools/                      strumenti fuori dalla presentazione: ricerca e verifica della
                            porta AND (node tools/and-verify.mjs), generatore del ticker
```

## Il contratto di una slide (`Slide` in `js/core/stage.js`)

- Ha un `name`, che è anche l'identificativo nell'URL, e un numero di passi `actCount`.
- `start()` e `stop()`: il `layer` (un div che copre il palco) esiste fra i due.
  Tutto quello che la slide crea va nel suo layer, mai in `body`.
- `enterAct(n, previous)` deve portare la slide al passo `n` **da qualunque stato**,
  anche da un passo successivo: ci contano ← e il ricaricamento su `#nome/n`.
- `next()` e `prev()` ricevono per primi → e ←: una slide che ha passi suoi (una cella,
  una riga) li gestisce e restituisce `true`, altrimenti il palco cambia passo.
- `update(dt, t)` a ogni fotogramma finché la slide è mostrata. Le animazioni vanno a
  tempo (`dt`), non a fotogrammi.
- `onKey(e)` riceve i tasti che la navigazione non usa e restituisce `true` se li usa.
  Il puntatore arriva in coordinate del palco.
- `createCanvas()` dà una canvas che disegna in pixel del palco ma ha il buffer alla
  risoluzione vera dello schermo, e viene ridimensionata da sola: una canvas ingrandita
  dal CSS verrebbe ricampionata e si vedrebbe sfocata.

Tasti comuni: vedi "Convenzioni comuni" in `SLIDES.md`. F5–F8 non si usano: nel browser
F5 ricarica la pagina.

## Convenzioni

- Commenti e identificatori in inglese; testi delle slide in italiano (sono pochi).
- I commenti spiegano perché, non cosa.
- Asset copiati da `../Life2023/images` e `../Life2023/data`; le immagini sono piccole e
  GMT cercherà versioni migliori.

## Trappole

- Gli screenshot del browser integrato possono fallire o uscire sbagliati se la finestra
  è dietro un'altra: per verificare geometria e stato si interroga il DOM con
  `javascript_tool`.
