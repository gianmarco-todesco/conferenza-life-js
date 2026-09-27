// For each switch of the AND gate and each phase of the guns (generation
// mod 30), is it clean to place the eater (stream off) or remove it (stream
// on) at that moment? Clean = afterwards the gate is cell by cell the same as
// one built in the new state.     node tools/and-phases.mjs
import {Grid, GUN} from './grid.mjs';
import {LAYOUT, eaterCells} from '../js/life/and-gate.js';

const OX = 200, OY = 150, W = 420, H = 320;

export function build(a, b) {
    const g = new Grid(W, H);
    for (const gun of [LAYOUT.gunA, LAYOUT.gunB, LAYOUT.gunT]) g.place(GUN, gun.x + OX, gun.y + OY, gun);
    for (const e of [LAYOUT.receiver, LAYOUT.endT, ...(a ? [] : [LAYOUT.switchA]), ...(b ? [] : [LAYOUT.switchB])])
        for (const [x, y] of eaterCells(e)) g.set(x + OX, y + OY, 1);
    return g;
}

export function setSwitch(g, e, present) {
    for (const [x, y] of eaterCells(e)) g.set(x + OX, y + OY, present ? 1 : 0);
}

// References in each state, run once and advanced alongside.
const snapshot = g => g.a.join('');

if (process.argv[1] && process.argv[1].endsWith('and-phases.mjs')) {
    const SETTLE = 900, AFTER = 600;
    const refs = {};
    for (const [a, b] of [[1, 1], [0, 1], [1, 0]]) {
        const g = build(a, b);
        refs[a + '' + b] = [];
        g.run(SETTLE + AFTER);
        for (let p = 0; p < 30; p++) { refs[a + '' + b].push(snapshot(g)); g.step(); }
    }
    for (const [name, e, off] of [['A', LAYOUT.switchA, '01'], ['B', LAYOUT.switchB, '10']]) {
        const place = [], remove = [];
        for (let p = 0; p < 30; p++) {
            let g = build(1, 1); g.run(SETTLE + p);
            setSwitch(g, e, true); g.run(AFTER - p);
            // After SETTLE + AFTER generations in all, compare with the reference.
            if (snapshot(g) === refs[off][0]) place.push(p);
            g = build(+off[0], +off[1]); g.run(SETTLE + p);
            setSwitch(g, e, false); g.run(AFTER - p);
            if (snapshot(g) === refs['11'][0]) remove.push(p);
        }
        console.log(name, 'place at phases', place.join(','), '| remove at phases', remove.join(','));
    }
}
