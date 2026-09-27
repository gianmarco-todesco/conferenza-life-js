// The "hodgepodge machine": a cellular automaton that imitates the
// Belousov-Zhabotinsky reaction, as BZReactionPage did it. On a torus.
//
// A cell is healthy (1), infected (2..q-1) or ill (q):
//   ill      -> healthy
//   healthy  -> min(a/k1 + b/k2 + 1, q)     a infected, b ill neighbours
//   infected -> min(s/(9-c) + g, q)         s sum of itself and neighbours,
//                                           c healthy neighbours
// Integer divisions, as in the C++.

export const PARAMS = {q: 210, k1: 3, k2: 3, g: 28};

// The palette was computed with the file-level q = 150, not with the board's
// 210: colors run past the dark end and come back lighter. Kept as it was.
const PALETTE_Q = 150;
const COL0 = [167, 158, 151];
const COL1 = [155, 75, 40];

// rand() of the Microsoft C runtime, so that seed 17 gives the starting
// configuration of the Qt version (on a board of the same size).
export class MsvcRand {
    constructor(seed) { this.state = seed >>> 0; }
    next() {
        this.state = (Math.imul(this.state, 214013) + 2531011) >>> 0;
        return (this.state >>> 16) & 0x7fff;
    }
}

export class BZModel {
    constructor(width, height, params = PARAMS) {
        this.width = width;
        this.height = height;
        this.p = params;
        const n = width * height;
        this.cells = new Uint8Array(n);
        this.old = new Uint8Array(n);
        // Neighbours in the order of the C++: E, SE, S, SW, W, NW, N, NE, so
        // that the even ones are the orthogonal ones (used by the colors).
        this.nb = new Int32Array(n * 8);
        for (let y = 0; y < height; y++) {
            const ya = (y + height - 1) % height, yb = (y + 1) % height;
            for (let x = 0; x < width; x++) {
                const xa = (x + width - 1) % width, xb = (x + 1) % width;
                const k = (y * width + x) * 8;
                this.nb.set([
                    y * width + xb, yb * width + xb, yb * width + x, yb * width + xa,
                    y * width + xa, ya * width + xa, ya * width + x, ya * width + xb,
                ], k);
            }
        }
        this.palette = new Uint8Array(256 * 3);
        for (let st = 0; st < 256; st++) {
            let t = (st - 1) / (PALETTE_Q - 1);
            t = 0.5 - 0.4 * Math.cos(t * Math.PI);
            for (let c = 0; c < 3; c++)
                this.palette[st * 3 + c] = Math.trunc((1 - t) * COL0[c] + t * COL1[c]);
        }
        this.reset(17);
    }

    // 10% of the cells half-way through the infection, the rest healthy.
    reset(seed) {
        const rnd = new MsvcRand(seed);
        const half = this.p.q >> 1;
        for (let i = 0; i < this.cells.length; i++) this.cells[i] = rnd.next() % 100 < 10 ? half : 1;
        this.old.fill(0);
        this.generation = 0;
    }

    step() {
        const {q, k1, k2, g} = this.p;
        const tmp = this.old; this.old = this.cells; this.cells = tmp;
        const old = this.old, cells = this.cells, nb = this.nb;
        for (let i = 0; i < cells.length; i++) {
            const st = old[i];
            if (st === q) { cells[i] = 1; continue; }
            let a = 0, b = 0, c = 0, s = st;
            for (let j = i * 8, e = j + 8; j < e; j++) {
                const v = old[nb[j]];
                s += v;
                if (v >= 2 && v < q) a++;
                else if (v === q) b++;
                else if (v === 1) c++;
            }
            cells[i] = st === 1
                ? Math.min(((a / k1) | 0) + ((b / k2) | 0) + 1, q)
                : Math.min(((s / (9 - c)) | 0) + g, q);
        }
        this.generation++;
    }

    // One pixel per cell. The color of a cell is a weighted average with its
    // neighbours (4 itself, 2 the orthogonal ones, 1 the diagonal ones).
    paint(imageData) {
        const d = imageData.data, cells = this.cells, nb = this.nb, pal = this.palette;
        for (let i = 0; i < cells.length; i++) {
            const j = i * 8;
            const v = cells[i] * 4
                + (cells[nb[j]] + cells[nb[j + 2]] + cells[nb[j + 4]] + cells[nb[j + 6]]) * 2
                + cells[nb[j + 1]] + cells[nb[j + 3]] + cells[nb[j + 5]] + cells[nb[j + 7]];
            const c = (v >> 4) * 3, o = i * 4;
            d[o] = pal[c]; d[o + 1] = pal[c + 1]; d[o + 2] = pal[c + 2]; d[o + 3] = 255;
        }
    }
}
