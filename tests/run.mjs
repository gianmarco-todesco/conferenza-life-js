// Tests of the engines, runnable without a browser:  node tests/run.mjs
// Each check pins a behaviour the slides rely on.

import {SimpleLife, parseRLE, BORN, DYING, ALIVE} from '../js/life/simplelife.js';
import {evolve, Rule30Model, MANUAL_ROWS} from '../js/life/rule30.js';
import {BZModel, MsvcRand, PARAMS} from '../js/life/bz.js';

let failures = 0;
function check(name, ok, detail = '') {
    console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || !detail ? '' : ': ' + detail));
    if (!ok) failures++;
}

function liveCells(life) {
    const out = [];
    life.forEachCell((x, y, s) => { if (s !== DYING) out.push(x + ',' + y); });
    return out.sort().join(' ');
}

{
    const life = new SimpleLife();
    life.place(parseRLE('bo$2bo$3o!'), 0, 0);
    const start = liveCells(life);
    for (let i = 0; i < 4; i++) life.step();
    const moved = start.split(' ').map(c => c.split(',').map(Number))
        .map(([x, y]) => (x + 1) + ',' + (y + 1)).sort().join(' ');
    check('a glider moves by (1,1) every 4 generations', liveCells(life) === moved, liveCells(life));
}

{
    // The title slide shows Kok's galaxy in its 8 phases.
    const galaxy = parseRLE('x = 9, y = 9\n6ob2o$6ob2o$7b2o$2o5b2o$2o5b2o$2o5b2o$2o$2ob6o$2ob6o!');
    check('RLE header gives the size', galaxy.w === 9 && galaxy.h === 9);
    const life = new SimpleLife();
    life.place(galaxy, 0, 0);
    const s0 = liveCells(life);
    let period = 0;
    for (let i = 1; i <= 16 && !period; i++) { life.step(); if (liveCells(life) === s0) period = i; }
    check("Kok's galaxy has period 8", period === 8, 'period ' + period);
}

{
    // Views fade cells in and out: they need to know which cells changed.
    const life = new SimpleLife();
    life.place(parseRLE('3o!'), 0, 0);        // a blinker
    life.settle();
    life.step();
    const states = {};
    life.forEachCell((x, y, s) => { states[x + ',' + y] = s; });
    check('blinker: the center survives', states['1,0'] === ALIVE);
    check('blinker: the ends are dying', states['0,0'] === DYING && states['2,0'] === DYING);
    check('blinker: the new cells are born', states['1,-1'] === BORN && states['1,1'] === BORN);
}

{
    // Edits are shown at once, not faded in.
    const life = new SimpleLife();
    life.set(5, 5, 1);
    let s = 0;
    life.forEachCell((x, y, st) => { s = st; });
    check('an edited cell is ALIVE, not BORN', s === ALIVE);
}

{
    // place() overwrites the whole bounding box, as the Qt version did.
    const life = new SimpleLife();
    life.set(1, 1, 1);
    life.place(parseRLE('x = 3, y = 3\no!'), 0, 0);
    check('place() clears the dead cells of the pattern box', life.get(1, 1) === 0 && life.get(0, 0) === 1);
}

{
    // The counts of the rules slide: a blinker, horizontal.
    const life = new SimpleLife();
    life.place(parseRLE('3o!'), 0, 0);
    const c = {};
    life.forEachCount((x, y, n, alive) => { c[x + ',' + y] = n + (alive ? 'a' : ''); });
    check('counts: the center of a blinker has 2 neighbours', c['1,0'] === '2a');
    check('counts: an end of a blinker has 1', c['0,0'] === '1a');
    check('counts: the cells above and below the center have 3', c['1,-1'] === '3' && c['1,1'] === '3');
}

{
    const rows = [Uint8Array.of(1)];
    for (let i = 0; i < 3; i++) rows.push(evolve(rows[rows.length - 1]));
    const txt = rows.map(r => r.join('')).join(' ');
    check('rule 30: the first rows', txt === '1 111 11001 1101111', txt);
}

{
    // The Rule 30 slide, driven as in the talk.
    const md = new Rule30Model();
    const run = s => { for (let t = 0; t < s; t += 0.02) md.update(0.02); };
    check('rule30: starts ready, no window', md.mode === 'ready' && !md.windowVisible);
    md.space();
    run(5);
    check('rule30: the scan stops on the first triple other than 000',
        md.mode === 'manual' && md.c === -1 && md.triple(md.c) === 1, md.mode + ' ' + md.c);
    md.space();
    check('rule30: Space moves one cell', md.c === 0 && md.triple(0) === 2);
    md.forward();
    run(5);
    check('rule30: → finishes and welds row 1, the scan restarts on row 2',
        md.m === 1 && md.mode === 'manual' && md.c === md.firstInteresting(1), md.m + ' ' + md.mode);
    md.back();
    check('rule30: ← at the start of row 2 goes back to the start of row 1',
        md.m === 0 && md.mode === 'ready');
    md.forward(); run(5); md.forward(); run(5);
    check('rule30: after row 2 the slide is in fast mode', md.m === MANUAL_ROWS && md.mode === 'fast');
    md.space(); md.forward();
    check('rule30: in fast mode Space and → add a row each', md.m === MANUAL_ROWS + 2);
    md.back(); md.back(); md.back();
    check('rule30: ← out of fast mode lands at the start of the last manual row',
        md.m === MANUAL_ROWS - 1 && md.mode === 'manual' && md.atRowStart());
}

{
    // The seed of the BZ slide goes through the rand() of the Microsoft C
    // runtime, as in the Qt version: srand(1) gives 41, 18467, 6334.
    const r = new MsvcRand(1);
    const v = [r.next(), r.next(), r.next()];
    check('MSVC rand() sequence', v.join() === '41,18467,6334', v.join());
    const bz = new BZModel(40, 30);
    for (let i = 0; i < 50; i++) bz.step();
    let ok = true;
    for (const c of bz.cells) if (c < 1 || c > PARAMS.q) ok = false;
    check('BZ: every cell stays between healthy (1) and ill (q)', ok);
    let moving = false;
    const before = bz.cells.slice();
    bz.step();
    for (let i = 0; i < before.length; i++) if (before[i] !== bz.cells[i]) moving = true;
    check('BZ: the reaction is still going after 50 steps', moving);
}

console.log(failures ? `\n${failures} FAILED` : '\nall ok');
process.exitCode = failures ? 1 : 0;
