// Life B3/S23 on an unbounded grid, for the small patterns of the first slides
// (title, rules, AND gate): a few thousand cells at most. Huge patterns go to
// hashlife.
//
// The previous generation is kept so that views can fade cells in and out:
// forEachCell() reports each cell as BORN, DYING or ALIVE.
//
// Coordinates are integers with y pointing down, like the screen and like RLE.

export const BORN = 1;
export const DYING = 2;
export const ALIVE = 3;

// Cells are packed into one number so that Set/Map compare them by value.
// 2^16 x 2^16 cells is far more than these slides use, and the key stays below
// 2^32, well inside the integers a double represents exactly.
const OFF = 32768;
const SPAN = 65536;
const key = (x, y) => (x + OFF) * SPAN + (y + OFF);
const keyX = k => Math.floor(k / SPAN) - OFF;
const keyY = k => (k % SPAN) - OFF;

export class SimpleLife {
    constructor() {
        this.clear();
    }

    clear() {
        this.cells = new Set();
        this.prev = new Set();
        this.generation = 0;
    }

    get(x, y) {
        return this.cells.has(key(x, y)) ? 1 : 0;
    }

    // Edits apply to both generations: an edited cell is shown at once, not
    // faded in as if the rule had produced it.
    set(x, y, v) {
        const k = key(x, y);
        if (v) { this.cells.add(k); this.prev.add(k); }
        else { this.cells.delete(k); this.prev.delete(k); }
    }

    // cells: [[x, y], ...] as returned by parseRLE; the whole bounding box
    // w x h is overwritten, dead cells included, as the Qt version did.
    place(pattern, x0, y0, {flipX = false, flipY = false} = {}) {
        const {w, h, cells} = pattern;
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) this.set(x0 + x, y0 + y, 0);
        for (const [x, y] of cells)
            this.set(x0 + (flipX ? w - 1 - x : x), y0 + (flipY ? h - 1 - y : y), 1);
    }

    step() {
        const counts = new Map();
        for (const k of this.cells) {
            const x = keyX(k), y = keyY(k);
            for (let dy = -1; dy <= 1; dy++)
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const n = key(x + dx, y + dy);
                    counts.set(n, (counts.get(n) || 0) + 1);
                }
        }
        const next = new Set();
        for (const [k, c] of counts)
            if (c === 3 || (c === 2 && this.cells.has(k))) next.add(k);
        this.prev = this.cells;
        this.cells = next;
        this.generation++;
    }

    // Forget the previous generation, so that nothing is fading any more.
    settle() {
        this.prev = new Set(this.cells);
    }

    forEachCell(cb) {
        for (const k of this.cells) cb(keyX(k), keyY(k), this.prev.has(k) ? ALIVE : BORN);
        for (const k of this.prev) if (!this.cells.has(k)) cb(keyX(k), keyY(k), DYING);
    }

    get population() {
        return this.cells.size;
    }
}

// Parses an RLE pattern: either a whole file (header line "x = .., y = ..")
// or just the body ("bo$2bo$3o!"). Lines starting with '#' are comments.
// Returns {w, h, cells: [[x, y], ...], rule}.
export function parseRLE(text) {
    let w = 0, h = 0, rule = 'B3/S23';
    let body = '';
    for (const line of text.split(/\r?\n/)) {
        const t = line.trim();
        if (t === '' || t[0] === '#') continue;
        const m = /^x\s*=\s*(\d+)\s*,\s*y\s*=\s*(\d+)(?:\s*,\s*rule\s*=\s*(\S+))?/i.exec(t);
        if (m) { w = +m[1]; h = +m[2]; if (m[3]) rule = m[3]; continue; }
        body += t;
    }
    const cells = [];
    let x = 0, y = 0, n = 0, maxX = 0;
    for (const c of body) {
        if (c === '!') break;
        if (c >= '0' && c <= '9') { n = n * 10 + (c.charCodeAt(0) - 48); continue; }
        const count = n || 1;
        n = 0;
        if (c === 'b' || c === '.') x += count;
        else if (c === '$') { x = 0; y += count; }
        else {
            for (let i = 0; i < count; i++) cells.push([x + i, y]);
            x += count;
            maxX = Math.max(maxX, x);
        }
    }
    if (!w) w = maxX;
    if (!h) h = cells.length ? y + 1 : 0;
    return {w, h, cells, rule};
}
