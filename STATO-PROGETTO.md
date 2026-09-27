# Stato del progetto

Documento di ripresa, aggiornato al 2026-09-27. Per il contenuto delle slide e le
decisioni prese su ciascuna vale `SLIDES.md`; per le regole di lavoro `CLAUDE.md`.

## A che punto siamo

Tutte le 15 slide dell'elenco sono **implementate** e pushate su `origin main`, un
commit per slide. Nessuna è ancora **provata**: `provata` lo mette GMT dopo averla
vista a schermo intero su un monitor vero. Finora le verifiche sono state fatte con i
test (`node tests/run.mjs`), con gli strumenti in `tools/` e nel pannello del browser
integrato, che è piccolo e più lento del vero.

| Commit | Contenuto |
|---|---|
| `ebdc014` | `SLIDES.md`, l'elenco definito con GMT |
| `3a2e7a7` | palco, navigazione, slide con le immagini |
| `cf00532` | motore Life con le sfumature, titolo |
| `cbac957` | Rule30 |
| `fe67a2f` | regole di Life |
| `224ff38` | reazione BZ e variante `bz-fusione` |
| `cfc1fd9` | visualizzatore hashlife: cannone p416, life-in-life, ticker |
| `942ba6f` | porta AND e i suoi strumenti di ricerca e verifica |

## Prossimo passo: il generatore del ticker

Deciso con GMT: un generatore in JS, `tools/ticker.html`, perché a ogni conferenza si
rigenera la scritta per chi ha invitato. Il `ticker.rle` attuale ("Giornate dello
Studente") è di un'edizione passata.

Il modo di lavorare concordato: **prima** leggere il vecchio generatore e scrivere a
GMT come funziona, con le domande, e **solo dopo** scrivere codice.

Il vecchio generatore è `loadTicker_old` in `../Life2023/src/GlLifeViewer.cpp`, e
`TickerPage` (in `TickerPage.cpp`) scrive il risultato in `data/ticker.rle`. Una
prima lettura, da verificare:

- **Una macchina per riga di pixel.** L'immagine (`images/pescara.png`, 443×31) ha una
  riga di pixel per macchina: `n = altezza dell'immagine`. Le macchine sono in fila
  lungo una diagonale, a passo `dx = 115`, `dy = 18`.
- **Ogni macchina è fatta di tre pezzi**, messi con `Pattern::set` in coordinate con
  la y in su:
  - un "duplicatore di glider" (37×74);
  - un "riflettore" (41×44), a una distanza che dipende dalla larghezza
    dell'immagine: `m = 10 + (larghezza − 45)/4`;
  - un convertitore glider → astronave (11×29).

  In fondo a sinistra, a `x0 − 5000`, c'è una colonna di eater che chiude le linee.
- **La scritta entra come glider.** Per ogni colonna `h` dell'immagine, e per ogni
  riga `i`, se il pixel è acceso si mette un glider nella macchina `i`. Le colonne
  vanno sfalsate di `(n − 1 − i)·5`, perché le macchine sono sulla diagonale. I glider
  si alternano fra due fasi (`glide0`, e `glide1` spostato di (12,11)).
- **La scritta si carica a blocchi.** Si caricano `chunk = 20` colonne, poi si fa
  avanzare l'universo di `4·23·chunk/2` generazioni, e così via. L'ipotesi è che i
  duplicatori siano anelli di memoria in cui i glider girano: 23 sembra il passo di un
  glider nell'anello, con 4 generazioni per cella.
- **C'è una seconda versione commentata** dello stesso ciclo, con un'altra formula per
  l'indice di colonna (`ix = h·chunk + j + 5·i`). Va capito quale delle due ha
  prodotto il `ticker.rle` attuale.
- **Il file viene scritto sottosopra**, perché il vecchio visualizzatore disegnava
  con la y in su: la slide lo carica ribaltato. Il generatore nuovo deve produrre la
  scritta dritta, e allora `TickerSlide` non dovrà più ribaltarla.

Domande da fare a GMT prima di scrivere il generatore:

1. Si parte da una scritta resa con un font, da un'immagine, o da entrambe? Con quale
   altezza in pixel? La vecchia era di 31 righe, cioè 31 macchine.
2. La scritta deve ripetersi all'infinito, come ora, o scorrere una volta sola?
3. I pezzi (duplicatore, riflettore, convertitore) venivano da Golly o li aveva
   costruiti GMT? Se c'è una fonte, conviene ripartire da lì.
4. Quale delle due versioni del ciclo di caricamento era quella buona?

## Cose da guardare a schermo intero

Tutte le scelte fatte senza GMT sono annotate nelle schede di `SLIDES.md`. Le più
importanti:

- **titolo**: le proporzioni sono ricalcolate a occhio dal 1024×768 originale.
- **didascalie**: stanno in una fascia scura in basso, non in alto a sinistra come
  nell'originale.
- **bz**: `bz-sim` e `bz-fusione` sono in alternativa. Una delle due va tolta
  dall'elenco dopo la prova.
- **rule30**: la cornice della finestrella e i contorni dei posti vuoti sono aggiunte
  mie. Le velocità sono valori miei, da regolare.
- **golrule**: il testo della regola al passo 1 l'ho scritto io.
- **life-in-life**:
  - va verificato se la metacella del primo piano, `(2214, −1928)`, è quella che cambia
    colore alla generazione 39000;
  - va verificato il valore 39000 stesso;
  - va misurata la resa della galassia intera a 1920×1080.
- **ticker**: lasciato girare a lungo, prende qualche centinaio di MB prima della
  garbage collection. Da provare sul portatile della conferenza.
- **porta-and**: la lettera T per il flusso trasversale, l'intestazione "A e B" della
  tavola di verità, e i 720 cicli di riscaldamento al passo 2.

## Aperto, a carico di GMT

- Gli autori di `wolfrule30.png`, `gol_hw.png` e `cloth1.jpg`, per le didascalie.
- Le immagini a risoluzione più alta: quelle di adesso arrivano al massimo a 1024×768.

## Per riprendere

```
cd conferenze/conferenza-life-js
python serve.py              # http://127.0.0.1:8766/
node tests/run.mjs           # i test dei motori, pochi secondi
node tools/and-verify.mjs    # la porta AND, una decina di secondi
```

L'URL porta slide e passo (`#porta-and/3`). Il pannello del browser integrato a volte non
fa gli screenshot se la finestra è dietro un'altra: lo stato si legge dal DOM, per esempio
con `(await import('/js/core/stage.js')).currentSlide()`.
