// Showing and driving a HashLife universe on a stage canvas.
//
// Rendering descends the quadtree and stops at the first node that is at most
// one pixel wide: from far away a pixel is a whole region, and its gray level
// is the fraction of live cells in it. Close up, cells are squares, with a
// border once they are big enough.
//
// The camera is (cx, cy) = world point at the center of the canvas, and
// scale = stage pixels per cell, from well below 1 (zoomed out) to ~100.

const BG = [100, 120, 130];
const CELL = [255, 255, 255];
const BORDER = [60, 60, 60];

// Speeds: 2^k generations every `every` frames.
export const SPEEDS = [
    {k: 0, every: 8}, {k: 0, every: 4}, {k: 0, every: 2}, {k: 0, every: 1},
    ...Array.from({length: 16}, (_, i) => ({k: i + 1, every: 1})),
];

const packRGB = ([r, g, b]) => (255 << 24) | (b << 16) | (g << 8) | r;   // little endian

export class HashView {
    constructor(life) {
        this.life = life;
        this.cam = {cx: 0, cy: 0, scale: 1};
        this.anim = null;
        this.running = false;
        this.speed = 3;
        this.frame = 0;
        this.target = null;     // generation to stop at, or null
        this.onStop = null;
    }

    // --- camera -----------------------------------------------------------

    setCamera(cx, cy, scale) {
        this.anim = null;
        this.cam = {cx, cy, scale};
    }

    // Animated: the scale moves on a log scale, and the center follows so
    // that zooming out and in again feels like one continuous movement.
    flyTo(cx, cy, scale, duration = 1.5) {
        this.anim = {from: {...this.cam}, to: {cx, cy, scale}, t: 0, duration};
    }

    fitBox(box, w, h, margin = 0.9) {
        const [x0, y0, x1, y1] = box;
        const scale = Math.min(w / (x1 - x0 + 1), h / (y1 - y0 + 1)) * margin;
        return {cx: (x0 + x1 + 1) / 2, cy: (y0 + y1 + 1) / 2, scale};
    }

    fitAll(w, h, animated = true) {
        const box = this.life.boundingBox();
        if (!box) return;
        const c = this.fitBox(box, w, h);
        if (animated) this.flyTo(c.cx, c.cy, c.scale, 1.2);
        else this.setCamera(c.cx, c.cy, c.scale);
    }

    zoomAt(p, factor, w, h) {
        this.anim = null;
        const c = this.cam;
        const wx = c.cx + (p.x - w / 2) / c.scale, wy = c.cy + (p.y - h / 2) / c.scale;
        c.scale = Math.max(1e-6, Math.min(100, c.scale * factor));
        c.cx = wx - (p.x - w / 2) / c.scale;
        c.cy = wy - (p.y - h / 2) / c.scale;
    }

    panPixels(dx, dy) {
        this.anim = null;
        this.cam.cx -= dx / this.cam.scale;
        this.cam.cy -= dy / this.cam.scale;
    }

    // --- time -------------------------------------------------------------

    get stepSize() {
        return 2 ** SPEEDS[this.speed].k;
    }

    setSpeed(i) {
        this.speed = Math.max(0, Math.min(SPEEDS.length - 1, i));
    }

    // One advance at the current speed, never past the target.
    stepOnce() {
        const k = SPEEDS[this.speed].k;
        if (this.target !== null) {
            const left = this.target - this.life.generation;
            if (left <= 2 ** k) {
                this.life.advanceBy(left, k);
                this.target = null;
                this.running = false;
                if (this.onStop) this.onStop();
                return;
            }
        }
        this.life.advance(k);
    }

    // Runs until generation g, then stops.
    runTo(g) {
        if (g <= this.life.generation) return;
        this.target = g;
        this.running = true;
    }

    update(dt) {
        if (this.anim) {
            const a = this.anim;
            a.t += dt;
            const u = Math.min(1, a.t / a.duration);
            const e = u * u * (3 - 2 * u);
            const ls = Math.log(a.from.scale) + (Math.log(a.to.scale) - Math.log(a.from.scale)) * e;
            this.cam.scale = Math.exp(ls);
            // The center moves in proportion to how far the zoom has gone, so
            // the target stays under the eye while zooming.
            const zf = Math.log(a.from.scale), zt = Math.log(a.to.scale);
            const f = Math.abs(zt - zf) > 1e-9 ? (ls - zf) / (zt - zf) : e;
            this.cam.cx = a.from.cx + (a.to.cx - a.from.cx) * f;
            this.cam.cy = a.from.cy + (a.to.cy - a.from.cy) * f;
            if (u >= 1) this.anim = null;
        }
        if (this.running && ++this.frame >= SPEEDS[this.speed].every) {
            this.frame = 0;
            this.stepOnce();
        }
    }

    // --- drawing ----------------------------------------------------------

    render(sc) {
        const ratio = sc.ratio;
        const W = sc.canvas.width, H = sc.canvas.height;
        if (!this.image || this.image.width !== W || this.image.height !== H) {
            this.image = sc.ctx.createImageData(W, H);
            this.pixels = new Uint32Array(this.image.data.buffer);
            this.density = new Float32Array(W * H);
        }
        const px = this.pixels, dens = this.density;
        const bg = packRGB(BG);
        px.fill(bg);
        const life = this.life;
        const s = this.cam.scale * ratio;            // buffer pixels per cell
        const ox = W / 2 - this.cam.cx * s;          // buffer x of world x = 0
        const oy = H / 2 - this.cam.cy * s;
        const {nw, ne, sw, se, pop} = life;

        if (s < 1) {
            // Far: accumulate live cells per pixel, then turn them into grays.
            dens.fill(0);
            const rec = (n, level, x, y) => {
                if (pop[n] === 0) return;
                const size = 2 ** level * s;
                const sx = ox + x * s, sy = oy + y * s;
                if (sx >= W || sy >= H || sx + size <= 0 || sy + size <= 0) return;
                if (size <= 1) {
                    const ix = Math.floor(sx + size / 2), iy = Math.floor(sy + size / 2);
                    if (ix >= 0 && iy >= 0 && ix < W && iy < H) dens[iy * W + ix] += pop[n];
                    return;
                }
                const h = 2 ** (level - 1);
                rec(nw[n], level - 1, x, y);
                rec(ne[n], level - 1, x + h, y);
                rec(sw[n], level - 1, x, y + h);
                rec(se[n], level - 1, x + h, y + h);
            };
            rec(life.root, life.rootLevel, life.x0, life.y0);
            // Cells per pixel = 1/s^2. A square root lifts sparse regions,
            // which would otherwise vanish: Life is rarely more than 40% alive.
            const perPixel = s * s;
            for (let i = 0; i < dens.length; i++) {
                const d = dens[i];
                if (d === 0) continue;
                const t = Math.min(1, Math.sqrt(d * perPixel / 0.5));
                px[i] = (255 << 24)
                    | (Math.round(BG[2] + (CELL[2] - BG[2]) * t) << 16)
                    | (Math.round(BG[1] + (CELL[1] - BG[1]) * t) << 8)
                    | Math.round(BG[0] + (CELL[0] - BG[0]) * t);
            }
        } else {
            // Near: every live cell is a square.
            const cell = packRGB(CELL), border = packRGB(BORDER);
            const b = s >= 6 ? Math.max(1, Math.round(s * 0.06)) : 0;
            const fill = (x0, y0, x1, y1, color) => {
                x0 = Math.max(0, x0); y0 = Math.max(0, y0);
                x1 = Math.min(W, x1); y1 = Math.min(H, y1);
                for (let y = y0; y < y1; y++) px.fill(color, y * W + x0, y * W + x1);
            };
            const rec = (n, level, x, y) => {
                if (pop[n] === 0) return;
                const size = 2 ** level * s;
                const sx = ox + x * s, sy = oy + y * s;
                if (sx >= W || sy >= H || sx + size <= 0 || sy + size <= 0) return;
                if (level === 0) {
                    const x0 = Math.round(sx), y0 = Math.round(sy);
                    const x1 = Math.round(sx + s), y1 = Math.round(sy + s);
                    if (b) { fill(x0, y0, x1, y1, border); fill(x0 + b, y0 + b, x1 - b, y1 - b, cell); }
                    else fill(x0, y0, Math.max(x1, x0 + 1), Math.max(y1, y0 + 1), cell);
                    return;
                }
                const h = 2 ** (level - 1);
                rec(nw[n], level - 1, x, y);
                rec(ne[n], level - 1, x + h, y);
                rec(sw[n], level - 1, x, y + h);
                rec(se[n], level - 1, x + h, y + h);
            };
            rec(life.root, life.rootLevel, life.x0, life.y0);
        }
        sc.ctx.putImageData(this.image, 0, 0);
    }
}
