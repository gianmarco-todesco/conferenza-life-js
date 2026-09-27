// A dense Life grid for offline searches (tools/*.mjs): fast, bounded, with
// cells outside the grid always dead.
import {parseRLE} from '../js/life/simplelife.js';

export class Grid {
    constructor(w, h) { this.w = w; this.h = h; this.a = new Uint8Array(w * h); this.b = new Uint8Array(w * h); this.gen = 0; }
    get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.a[y * this.w + x]; }
    set(x, y, v) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.a[y * this.w + x] = v; }
    place(p, x0, y0, {flipX = false, flipY = false} = {}) {
        for (const [x, y] of p.cells) this.set(x0 + (flipX ? p.w - 1 - x : x), y0 + (flipY ? p.h - 1 - y : y), 1);
    }
    step() {
        const {w, h, a, b} = this;
        for (let y = 0; y < h; y++) {
            const y0 = y > 0 ? (y - 1) * w : -1, y1 = y * w, y2 = y < h - 1 ? (y + 1) * w : -1;
            for (let x = 0; x < w; x++) {
                let n = 0;
                const xl = x > 0, xr = x < w - 1;
                if (y0 >= 0) { if (xl) n += a[y0 + x - 1]; n += a[y0 + x]; if (xr) n += a[y0 + x + 1]; }
                if (xl) n += a[y1 + x - 1]; if (xr) n += a[y1 + x + 1];
                if (y2 >= 0) { if (xl) n += a[y2 + x - 1]; n += a[y2 + x]; if (xr) n += a[y2 + x + 1]; }
                b[y1 + x] = n === 3 || (n === 2 && a[y1 + x]) ? 1 : 0;
            }
        }
        this.a = b; this.b = a; this.gen++;
    }
    run(n) { for (let i = 0; i < n; i++) this.step(); }
    count(x0, y0, x1, y1) {
        let c = 0;
        for (let y = Math.max(0, y0); y <= Math.min(this.h - 1, y1); y++)
            for (let x = Math.max(0, x0); x <= Math.min(this.w - 1, x1); x++) c += this.a[y * this.w + x];
        return c;
    }
    cells(x0 = 0, y0 = 0, x1 = this.w - 1, y1 = this.h - 1) {
        const out = [];
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (this.get(x, y)) out.push([x, y]);
        return out;
    }
}

export const GUN = parseRLE('x = 36, y = 9\n24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o$2o8bo3bob2o4bobo$10bo5bo7bo$11bo3bo$12b2o!');
export const EATER = parseRLE('x = 4, y = 4\n2o$obo$2bo$2b2o!');
export const GLIDER_SE = parseRLE('bo$2bo$3o!');
