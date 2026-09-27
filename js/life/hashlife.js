// HashLife (Gosper's algorithm) for Life B3/S23, for the huge patterns at the
// end of the talk: the p416 gun, the metapixel galaxy, the ticker.
//
// The universe is a quadtree of canonical nodes: equal subtrees are the same
// node (hash-consing), so repeated structures such as the metacells are stored
// once. The future of a node's center is memoized, which is what makes jumps
// of 2^k generations cheap once the cache is warm.
//
// Nodes live in typed arrays, not in JS objects: the galaxy needs millions of
// them. Node 0 is the dead cell, node 1 the live one (level 0), so the value
// of a leaf is its id.
//
// Two memos per node:
//   full   the center after 2^(L-2) generations (the natural HashLife step).
//          Valid for ever: changing speed never throws it away.
//   step   the center after 2^k generations, k < L-2, for the current k only.
//
// World coordinates are Numbers, y pointing down. They are exact up to 2^53,
// far beyond anything these slides reach; the generation count too.

const EMPTY_SLOT = 0;   // in the hash table: slot i holds node id + 1

export class HashLife {
    constructor({capacity = 1 << 20, gcLimit = 8_000_000} = {}) {
        this.gcLimit = gcLimit;
        this._alloc(capacity);
        this.clear();
    }

    _alloc(capacity) {
        this.cap = capacity;
        this.nw = new Int32Array(capacity);
        this.ne = new Int32Array(capacity);
        this.sw = new Int32Array(capacity);
        this.se = new Int32Array(capacity);
        this.lev = new Uint8Array(capacity);
        // Population as float: exact far beyond the cells of these patterns,
        // and only used for emptiness tests and for gray levels.
        this.pop = new Float64Array(capacity);
        this.full = new Int32Array(capacity).fill(-1);
        this.stepRes = new Int32Array(capacity).fill(-1);
        this.stepK = new Int16Array(capacity).fill(-1);
        this.tableSize = 1;
        while (this.tableSize < capacity * 2) this.tableSize <<= 1;
        this.table = new Int32Array(this.tableSize);
        this.count = 2;
        this.lev[0] = this.lev[1] = 0;
        this.pop[0] = 0; this.pop[1] = 1;
        this.emptyAt = [0];
    }

    // Grows every array to a new capacity, keeping the ids.
    _grow() {
        const old = this;
        const cap = this.cap * 2;
        const copy = (A, fill) => { const a = new A.constructor(cap); if (fill !== undefined) a.fill(fill); a.set(A); return a; };
        this.nw = copy(old.nw); this.ne = copy(old.ne); this.sw = copy(old.sw); this.se = copy(old.se);
        this.lev = copy(old.lev); this.pop = copy(old.pop);
        this.full = copy(old.full, -1); this.stepRes = copy(old.stepRes, -1); this.stepK = copy(old.stepK, -1);
        this.cap = cap;
        this._rehash(cap * 2);
    }

    _rehash(size) {
        let s = 1;
        while (s < size) s <<= 1;
        this.tableSize = s;
        this.table = new Int32Array(s);
        for (let id = 2; id < this.count; id++) this._tableInsert(id);
    }

    _hash(a, b, c, d) {
        let h = Math.imul(a, 0x9E3779B1) ^ Math.imul(b, 0x85EBCA77);
        h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) ^ Math.imul(c, 0xC2B2AE3D);
        h = Math.imul(h ^ (h >>> 13), 0x27D4EB2F) ^ Math.imul(d, 0x165667B1);
        return (h ^ (h >>> 16)) >>> 0;
    }

    _tableInsert(id) {
        const mask = this.tableSize - 1;
        let i = this._hash(this.nw[id], this.ne[id], this.sw[id], this.se[id]) & mask;
        while (this.table[i] !== EMPTY_SLOT) i = (i + 1) & mask;
        this.table[i] = id + 1;
    }

    // The canonical node with these four children.
    node(a, b, c, d) {
        const mask = this.tableSize - 1;
        let i = this._hash(a, b, c, d) & mask;
        for (;;) {
            const t = this.table[i];
            if (t === EMPTY_SLOT) break;
            const id = t - 1;
            if (this.nw[id] === a && this.ne[id] === b && this.sw[id] === c && this.se[id] === d) return id;
            i = (i + 1) & mask;
        }
        if (this.count >= this.cap) { this._grow(); return this.node(a, b, c, d); }
        const id = this.count++;
        this.nw[id] = a; this.ne[id] = b; this.sw[id] = c; this.se[id] = d;
        this.lev[id] = this.lev[a] + 1;
        this.pop[id] = this.pop[a] + this.pop[b] + this.pop[c] + this.pop[d];
        this.full[id] = -1;
        this.stepK[id] = -1;
        this.table[i] = id + 1;
        return id;
    }

    empty(level) {
        while (this.emptyAt.length <= level) {
            const e = this.emptyAt[this.emptyAt.length - 1];
            this.emptyAt.push(this.node(e, e, e, e));
        }
        return this.emptyAt[level];
    }

    // --- evolution --------------------------------------------------------

    // Level 2 (4x4) -> its 2x2 center after one generation.
    _base(n) {
        const {nw, ne, sw, se} = this;
        const a = nw[n], b = ne[n], c = sw[n], d = se[n];
        // Rows of the 4x4, each 4 bits, x = 0 in the high bit.
        const r0 = (nw[a] << 3) | (ne[a] << 2) | (nw[b] << 1) | ne[b];
        const r1 = (sw[a] << 3) | (se[a] << 2) | (sw[b] << 1) | se[b];
        const r2 = (nw[c] << 3) | (ne[c] << 2) | (nw[d] << 1) | ne[d];
        const r3 = (sw[c] << 3) | (se[c] << 2) | (sw[d] << 1) | se[d];
        const rows = [r0, r1, r2, r3];
        const bit = (x, y) => (rows[y] >> (3 - x)) & 1;
        const next = (x, y) => {
            let k = 0;
            for (let dy = -1; dy <= 1; dy++)
                for (let dx = -1; dx <= 1; dx++)
                    if (dx || dy) k += bit(x + dx, y + dy);
            return k === 3 || (k === 2 && bit(x, y)) ? 1 : 0;
        };
        return this.node(next(1, 1), next(2, 1), next(1, 2), next(2, 2));
    }

    // The center (level L-1) after 2^(L-2) generations.
    _full(n) {
        const L = this.lev[n];
        if (this.pop[n] === 0) return this.empty(L - 1);
        const memo = this.full[n];
        if (memo >= 0) return memo;
        let r;
        if (L === 2) r = this._base(n);
        else {
            const s = this._nine(n);
            const q = s.map(x => this._full(x));
            r = this.node(
                this._full(this.node(q[0], q[1], q[3], q[4])),
                this._full(this.node(q[1], q[2], q[4], q[5])),
                this._full(this.node(q[3], q[4], q[6], q[7])),
                this._full(this.node(q[4], q[5], q[7], q[8])));
        }
        this.full[n] = r;
        return r;
    }

    // The center (level L-1) after 2^k generations, k <= L-2.
    _step(n, k) {
        const L = this.lev[n];
        if (k >= L - 2) return this._full(n);
        if (this.pop[n] === 0) return this.empty(L - 1);
        if (this.stepK[n] === k) return this.stepRes[n];
        const s = this._nine(n);
        const q = s.map(x => this._step(x, k));
        // The second stage only takes the centers: no more time passes.
        const {nw, ne, sw, se} = this;
        const center = (a, b, c, d) => this.node(se[a], sw[b], ne[c], nw[d]);
        const r = this.node(
            center(q[0], q[1], q[3], q[4]),
            center(q[1], q[2], q[4], q[5]),
            center(q[3], q[4], q[6], q[7]),
            center(q[4], q[5], q[7], q[8]));
        this.stepK[n] = k;
        this.stepRes[n] = r;
        return r;
    }

    // The 3x3 overlapping subnodes (level L-1) of a node of level L.
    _nine(n) {
        const {nw, ne, sw, se} = this;
        const a = nw[n], b = ne[n], c = sw[n], d = se[n];
        return [
            a, this.node(ne[a], nw[b], se[a], sw[b]), b,
            this.node(sw[a], se[a], nw[c], ne[c]),
            this.node(se[a], sw[b], ne[c], nw[d]),
            this.node(sw[b], se[b], nw[d], ne[d]),
            c, this.node(ne[c], nw[d], se[c], sw[d]), d,
        ];
    }

    // --- the universe -----------------------------------------------------

    clear() {
        this.root = this.empty(3);
        this.rootLevel = 3;
        this.x0 = -4;     // world coordinates of the root's top-left corner
        this.y0 = -4;
        this.generation = 0;
    }

    get population() {
        return this.pop[this.root];
    }

    _expand() {
        const L = this.rootLevel, r = this.root, e = this.empty(L - 1);
        const {nw, ne, sw, se} = this;
        this.root = this.node(
            this.node(e, e, e, nw[r]), this.node(e, e, ne[r], e),
            this.node(e, sw[r], e, e), this.node(se[r], e, e, e));
        const half = 2 ** (L - 1);
        this.x0 -= half;
        this.y0 -= half;
        this.rootLevel = L + 1;
    }

    // Is all the population inside the central quarter (level L-2)?
    _centered() {
        const {nw, ne, sw, se} = this;
        const r = this.root;
        const c = this.node(se[nw[r]], sw[ne[r]], ne[sw[r]], nw[se[r]]);   // level L-1
        const cc = this.node(se[nw[c]], sw[ne[c]], ne[sw[c]], nw[se[c]]);  // level L-2
        return this.pop[cc] === this.pop[r];
    }

    // Advances by 2^k generations.
    advance(k) {
        while (this.rootLevel < k + 3 || !this._centered()) this._expand();
        this.root = this._step(this.root, k);
        const q = 2 ** (this.rootLevel - 2);
        this.x0 += q;
        this.y0 += q;
        this.rootLevel -= 1;
        this.generation += 2 ** k;
        if (this.count > this.gcLimit) this.collect();
    }

    // Advances by exactly n generations, with steps of at most 2^kMax.
    advanceBy(n, kMax = 30) {
        while (n > 0) {
            let k = Math.min(kMax, Math.floor(Math.log2(n)));
            while (2 ** k > n) k--;
            this.advance(k);
            n -= 2 ** k;
        }
    }

    // Garbage collection: keeps what the root reaches, memos included (so
    // nothing has to be recomputed), and compacts the arrays. If that is
    // still too much, collects again without the memos.
    collect(keepMemos = true) {
        const live = new Uint8Array(this.count);
        live[0] = live[1] = 1;
        const stack = [this.root, ...this.emptyAt];
        const {nw, ne, sw, se, full, stepRes, stepK} = this;
        while (stack.length) {
            const n = stack.pop();
            if (n < 0 || live[n]) continue;
            live[n] = 1;
            if (this.lev[n] > 0) stack.push(nw[n], ne[n], sw[n], se[n]);
            if (keepMemos) {
                if (full[n] >= 0) stack.push(full[n]);
                if (stepK[n] >= 0) stack.push(stepRes[n]);
            }
        }
        // Children have smaller ids than their parents, so a single forward
        // pass renumbers them before they are used.
        const map = new Int32Array(this.count).fill(-1);
        map[0] = 0; map[1] = 1;
        let next = 2;
        for (let id = 2; id < this.count; id++) if (live[id]) map[id] = next++;
        for (let id = 2; id < this.count; id++) {
            const m = map[id];
            if (m < 0) continue;
            nw[m] = map[nw[id]]; ne[m] = map[ne[id]]; sw[m] = map[sw[id]]; se[m] = map[se[id]];
            this.lev[m] = this.lev[id];
            this.pop[m] = this.pop[id];
            const f = full[id], s = stepK[id] >= 0 ? stepRes[id] : -1;
            full[m] = keepMemos && f >= 0 && map[f] >= 0 ? map[f] : -1;
            if (keepMemos && s >= 0 && map[s] >= 0) { stepRes[m] = map[s]; stepK[m] = stepK[id]; }
            else stepK[m] = -1;
        }
        full.fill(-1, next); stepK.fill(-1, next);
        this.count = next;
        this.root = map[this.root];
        this.emptyAt = this.emptyAt.map(e => map[e]);
        this.table.fill(0);
        for (let id = 2; id < this.count; id++) this._tableInsert(id);
        if (keepMemos && this.count > this.gcLimit * 0.6) this.collect(false);
    }

    // --- building ---------------------------------------------------------

    // Replaces the universe with the given node, whose top-left corner is at
    // world (x0, y0).
    setRoot(root, x0, y0) {
        this.root = root;
        this.rootLevel = this.lev[root];
        this.x0 = x0;
        this.y0 = y0;
        this.generation = 0;
        while (this.rootLevel < 3) this._expand();
    }

    // Builds the universe from live cells [[x, y], ...], bottom-up.
    setCells(cells) {
        this.clear();
        if (!cells.length) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const [x, y] of cells) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
        let L = 3;
        while (2 ** L < Math.max(maxX - minX + 1, maxY - minY + 1)) L++;
        // Level by level: a Map from packed (x, y) to node id.
        let cur = new Map();
        const W = 2 ** L;
        for (const [x, y] of cells) cur.set((y - minY) * W + (x - minX), 1);
        for (let level = 0, w = W; level < L; level++, w /= 2) {
            const groups = new Map();
            for (const [k, id] of cur) {
                const x = k % w, y = Math.floor(k / w);
                const g = Math.floor(y / 2) * (w / 2) + Math.floor(x / 2);
                let q = groups.get(g);
                if (!q) { q = [-1, -1, -1, -1]; groups.set(g, q); }
                q[(y & 1) * 2 + (x & 1)] = id;
            }
            const e = this.empty(level);
            cur = new Map();
            for (const [g, q] of groups)
                cur.set(g, this.node(q[0] < 0 ? e : q[0], q[1] < 0 ? e : q[1], q[2] < 0 ? e : q[2], q[3] < 0 ? e : q[3]));
        }
        this.setRoot(cur.values().next().value, minX, minY);
    }

    // [minX, minY, maxX, maxY] of the live cells, or null. Each bound is a
    // descent that visits the nearer half first and skips any node that
    // cannot beat the best found so far, so it is cheap on big patterns.
    boundingBox() {
        if (this.pop[this.root] === 0) return null;
        const {nw, ne, sw, se, pop} = this;
        const L = this.rootLevel;
        // sign +1: the smallest coordinate; sign -1: the largest (as -max).
        const bound = (near, far, origin, sign) => {
            let best = Infinity;
            const rec = (n, level, pos) => {
                if (pop[n] === 0) return;
                const size = 2 ** level;
                const extreme = sign > 0 ? pos : -(pos + size - 1);
                if (extreme >= best) return;
                if (level === 0) { best = extreme; return; }
                const h = size / 2;
                const pNear = sign > 0 ? pos : pos + h, pFar = sign > 0 ? pos + h : pos;
                for (const c of near(n)) rec(c, level - 1, pNear);
                for (const c of far(n)) rec(c, level - 1, pFar);
            };
            rec(this.root, L, origin);
            return sign * best;
        };
        const W = n => [nw[n], sw[n]], E = n => [ne[n], se[n]];
        const N = n => [nw[n], ne[n]], S = n => [sw[n], se[n]];
        return [
            bound(W, E, this.x0, 1), bound(N, S, this.y0, 1),
            bound(E, W, this.x0, -1), bound(S, N, this.y0, -1),
        ];
    }

    get(x, y) {
        let n = this.root, L = this.rootLevel;
        x -= this.x0; y -= this.y0;
        if (x < 0 || y < 0 || x >= 2 ** L || y >= 2 ** L) return 0;
        while (L > 0) {
            const h = 2 ** (L - 1);
            if (y < h) n = x < h ? this.nw[n] : this.ne[n];
            else n = x < h ? this.sw[n] : this.se[n];
            if (x >= h) x -= h;
            if (y >= h) y -= h;
            L--;
        }
        return n;
    }
}
