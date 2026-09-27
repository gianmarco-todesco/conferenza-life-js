// Loading patterns into a HashLife universe: RLE and Golly's macrocell (.mc).

import {parseRLE} from './simplelife.js';

// Macrocell: the quadtree itself, one node per line, children by line number.
//   [M2] ...          header
//   #R B3/S23         comments and metadata
//   ..*$.*$***$       a leaf: an 8x8 block (level 3), rows ended by '$'
//   4 1 2 0 3         a node of level 4: nw ne sw se, 0 = empty
// The last node is the root; Golly puts its center at the origin.
export function loadMacrocell(life, text) {
    life.clear();
    const ids = [null];   // 1-based, as in the file
    let root = -1;
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        if (line === '' || line[0] === '#' || line[0] === '[') continue;
        let id;
        if (line[0] === '.' || line[0] === '*' || line[0] === '$') id = leaf(life, line);
        else {
            const [level, a, b, c, d] = line.split(/\s+/).map(Number);
            const child = k => (k === 0 ? life.empty(level - 1) : ids[k]);
            id = life.node(child(a), child(b), child(c), child(d));
        }
        ids.push(id);
        root = id;
    }
    if (root < 0) return;
    const half = 2 ** (life.lev[root] - 1);
    life.setRoot(root, -half, -half);
}

function leaf(life, line) {
    const bits = [];
    for (let y = 0; y < 8; y++) bits.push(new Uint8Array(8));
    let x = 0, y = 0;
    for (const c of line) {
        if (c === '$') { x = 0; y++; }
        else { if (c === '*' && x < 8 && y < 8) bits[y][x] = 1; x++; }
    }
    // 8x8 -> 4x4 of level 1 -> 2x2 of level 2 -> 1 of level 3.
    let grid = bits.map(r => Array.from(r));
    for (let n = 8; n > 1; n /= 2) {
        const next = [];
        for (let j = 0; j < n / 2; j++) {
            const row = [];
            for (let i = 0; i < n / 2; i++)
                row.push(life.node(grid[2 * j][2 * i], grid[2 * j][2 * i + 1],
                                   grid[2 * j + 1][2 * i], grid[2 * j + 1][2 * i + 1]));
            next.push(row);
        }
        grid = next;
    }
    return grid[0][0];
}

// flipY mirrors the pattern upside down (see TickerSlide).
export function loadRLE(life, text, {flipY = false} = {}) {
    const cells = parseRLE(text).cells;
    life.setCells(flipY ? cells.map(([x, y]) => [x, -y]) : cells);
}

// By file name: .mc is macrocell, anything else RLE.
export function loadPattern(life, name, text, options = {}) {
    if (/\.mc$/i.test(name)) loadMacrocell(life, text);
    else loadRLE(life, text, options);
}
