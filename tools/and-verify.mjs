// Verifies the AND gate of the 'porta-and' slide:  node tools/and-verify.mjs
//   1. the truth table: gliders reach the receiver iff A and B are on, and
//      the whole thing is periodic (nothing escapes, nothing piles up);
//   2. switching A and B on and off at any time leaves no debris, if the
//      switch eater is only placed or removed when no glider touches it.
import {Grid, GUN, EATER} from './grid.mjs';
import {LAYOUT} from '../js/life/and-gate.js';

const OX = 200, OY = 150, W = 420, H = 320;

function build(a, b) {
    const g = new Grid(W, H);
    for (const gun of [LAYOUT.gunA, LAYOUT.gunB, LAYOUT.gunT]) g.place(GUN, gun.x + OX, gun.y + OY, gun);
    for (const e of [LAYOUT.receiver, LAYOUT.endT]) g.place(EATER, e.x + OX, e.y + OY, e);
    if (!a) g.place(EATER, LAYOUT.switchA.x + OX, LAYOUT.switchA.y + OY, LAYOUT.switchA);
    if (!b) g.place(EATER, LAYOUT.switchB.x + OX, LAYOUT.switchB.y + OY, LAYOUT.switchB);
    return g;
}

import {sensorHit} from '../js/life/and-gate.js';
const gridLife = g => ({get: (x, y) => g.get(x + OX, y + OY)});

// Over four periods at steady state: which sensors saw a glider, and is the
// population periodic?
function steady(g, settle = 900) {
    g.run(settle);
    const seen = {};
    const pops = [];
    for (let i = 0; i <= 120; i++) {
        for (const [k, s] of Object.entries(LAYOUT.sensors)) if (sensorHit(gridLife(g), s)) seen[k] = true;
        if (i % 30 === 0) pops.push(g.count(0, 0, W - 1, H - 1));
        g.step();
    }
    return {seen, periodic: pops.every(p => p === pops[0])};
}

let failures = 0;
const check = (name, ok, detail = '') => {
    console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : '  ' + detail));
    if (!ok) failures++;
};

for (const [a, b] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
    const r = steady(build(a, b));
    const want = {A: !!a, B: !!b, T0: true, T: !b, out: !!(a && b)};
    const got = Object.fromEntries(Object.keys(want).map(k => [k, !!r.seen[k]]));
    check(`A=${a} B=${b}: periodic, sensors ${JSON.stringify(want)}`,
        r.periodic && JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got));
}

// Switching with the rule of js/life/and-gate.js.
import {switchReady, eaterCells} from '../js/life/and-gate.js';

function toggle(g, e, on) {       // on = stream on = eater out
    for (let tries = 0; tries < 60; tries++) {
        if (switchReady(g.gen, on)) {
            for (const [x, y] of eaterCells(e)) g.set(x + OX, y + OY, on ? 0 : 1);
            return tries;
        }
        g.step();
    }
    return -1;
}

let seed = 7;
const rnd = n => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) % n;
const g = build(1, 1);
g.run(900);
let a = 1, b = 1, waits = [];
for (let i = 0; i < 16; i++) {
    g.run(40 + rnd(200));
    if (rnd(2)) { a ^= 1; waits.push(toggle(g, LAYOUT.switchA, a)); }
    else { b ^= 1; waits.push(toggle(g, LAYOUT.switchB, b)); }
}
check('switching waits a few generations at most', waits.every(w => w >= 0 && w < 60), waits.join(','));
g.run(600);
const reference = build(a, b);
reference.run(g.gen);
check(`after 16 random switches (A=${a} B=${b}) the gate is cell by cell as if built that way`,
    g.a.join('') === reference.a.join(''));

console.log(failures ? `${failures} FAILED` : 'all ok');
process.exitCode = failures ? 1 : 0;
