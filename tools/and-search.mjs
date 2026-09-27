// Searches the geometry of the AND gate of the 'porta-and' slide.
//   node tools/and-search.mjs
//
// T fires down-left, A and B fire down-right; T meets B first, then A. For a
// pair of streams, a placement is clean if, once the guns are removed, the
// gliders still in flight annihilate in pairs and nothing is left behind.
import {Grid, GUN} from './grid.mjs';

const OX = 200, OY = 150, W = 420, H = 320;   // world (0,0) at grid (OX, OY)
const BOX = 36;                                 // guns are 36x9

// Where a down-right stream from a gun at (x, y) and a down-left one from
// (tx, ty) cross: the gliders run along x - y = x - y + 13.5 and
// x + y = tx + ty + 21.5 (measured on a lone gun).
export function crossing(gun, tgun) {
    const b = gun[0] - gun[1] + 13.5, t = tgun[0] + tgun[1] + 21.5;
    return [(t + b) / 2, (t - b) / 2];
}

// Clean: at steady state nothing gets past the crossing (below it) during
// a whole period, and the population repeats every 30 generations, so there
// is no debris piling up either.
function clean(guns, cy, settle = 700) {
    const g = new Grid(W, H);
    for (const [x, y, flipX] of guns) g.place(GUN, x + OX, y + OY, {flipX});
    g.run(settle);
    const pops = [];
    for (let i = 0; i <= 90; i++) {
        if (g.count(15, Math.ceil(cy + 12 + OY), W - 16, H - 16) > 0) return false;
        if (i % 30 === 0) pops.push(g.count(0, 0, W - 1, H - 1));
        g.step();
    }
    return pops.every(p => p === pops[0]);
}

export const T_GUN = [64, -75, true];
export const B_BASE = [-63, -80, false];
export const A_BASE = [-143, -80, false];

function search(label, fixed, base) {
    const found = [];
    for (let j = -4; j <= 4; j++)
        for (let i = -4; i <= 4; i++) {
            const gun = [base[0] + i, base[1] + j, false];
            if (clean([fixed, gun], crossing(gun, fixed)[1])) found.push([i, j]);
        }
    console.log(label, 'crossing near', crossing(base, fixed), 'clean offsets:', JSON.stringify(found));
    return found;
}

if (process.argv[1] && process.argv[1].endsWith('and-search.mjs')) {
    // Sanity: a lone gun is not clean (its gliders get past the crossing).
    console.log('lone B clean?', clean([B_BASE], crossing(B_BASE, T_GUN)[1]));
    search('B vs T', T_GUN, B_BASE);
    search('A vs T', T_GUN, A_BASE);
}

// --- eaters ---------------------------------------------------------------

import {EATER} from './grid.mjs';
export const ORIENTATIONS = [
    {flipX: false, flipY: false}, {flipX: true, flipY: false},
    {flipX: false, flipY: true}, {flipX: true, flipY: true},
];

// An eater at (ex, ey) swallows the stream of `gun` if nothing gets more
// than 8 rows past it, the population repeats every 30 generations, and the
// eater is still there.
export function eats(gun, ex, ey, o, settle = 700) {
    const g = new Grid(W, H);
    g.place(GUN, gun[0] + OX, gun[1] + OY, {flipX: gun[2]});
    g.place(EATER, ex + OX, ey + OY, o);
    g.run(settle);
    const pops = [];
    for (let i = 0; i <= 90; i++) {
        if (g.count(15, ey + 12 + OY, W - 16, H - 16) > 0) return false;
        if (i % 30 === 0) pops.push(g.count(0, 0, W - 1, H - 1));
        g.step();
    }
    if (!pops.every(p => p === pops[0])) return false;
    // The eater's own cells are still alive.
    for (const [x, y] of EATER.cells) {
        const xx = ex + (o.flipX ? EATER.w - 1 - x : x), yy = ey + (o.flipY ? EATER.h - 1 - y : y);
        if (!g.get(xx + OX, yy + OY)) return false;
    }
    return true;
}

// Eater positions near the point of the stream at height y.
export function eaterSearch(label, gun, y, down) {
    // The stream's diagonal at height y: x - y = const (down-right) or
    // x + y = const (down-left).
    const x = down === 'right' ? y + gun[0] - gun[1] + 13.5 : gun[0] + gun[1] + 21.5 - y;
    const found = [];
    for (const o of ORIENTATIONS)
        for (let j = -3; j <= 3; j++)
            for (let i = -4; i <= 4; i++) {
                const ex = Math.round(x) + i - 2, ey = y + j - 2;
                if (eats(gun, ex, ey, o)) found.push({ex, ey, ...o});
            }
    console.log(label, 'eaters:', JSON.stringify(found));
    return found;
}
