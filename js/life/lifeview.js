// Drawing and driving a SimpleLife on a stage canvas: camera, fading cells,
// grid, mouse editing, and the clock that decides when a generation happens.

import {BORN, DYING} from './simplelife.js';

// The look of the original Qt slides.
export const COLORS = {
    bg: 'rgb(100,120,130)',
    cell: [255, 255, 255],
    border: 'rgb(60,60,60)',
    grid: 'rgba(40,40,40,0.55)',
};

export class LifeView {
    // cx, cy: world point at the center of the canvas; cellPx: size of a cell.
    constructor(life, {cx = 0, cy = 0, cellPx = 20, grid = false} = {}) {
        this.life = life;
        this.cx = cx;
        this.cy = cy;
        this.cellPx = cellPx;
        this.grid = grid;
    }

    setCamera(cx, cy, cellPx) {
        this.cx = cx; this.cy = cy; this.cellPx = cellPx;
    }

    toScreen(x, y, w, h) {
        return {x: w / 2 + (x - this.cx) * this.cellPx, y: h / 2 + (y - this.cy) * this.cellPx};
    }

    toWorld(p, w, h) {
        return {x: this.cx + (p.x - w / 2) / this.cellPx, y: this.cy + (p.y - h / 2) / this.cellPx};
    }

    // Keeps the world point under p fixed while zooming.
    zoomAt(p, factor, w, h) {
        const before = this.toWorld(p, w, h);
        this.cellPx = Math.max(0.5, Math.min(200, this.cellPx * factor));
        const after = this.toWorld(p, w, h);
        this.cx += before.x - after.x;
        this.cy += before.y - after.y;
    }

    panPixels(dx, dy) {
        this.cx -= dx / this.cellPx;
        this.cy -= dy / this.cellPx;
    }

    // fade: 0 right after a generation, 1 when the transition is over. Born
    // cells fade in and dying cells fade out over it.
    render(sc, fade = 1) {
        const {ctx, width: w, height: h} = sc;
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, w, h);
        const s = this.cellPx;
        const x0 = this.cx - w / 2 / s, y0 = this.cy - h / 2 / s;
        const x1 = x0 + w / s + 1, y1 = y0 + h / s + 1;
        if (this.grid && s >= 6) this.drawGrid(ctx, w, h);
        // Borders only when cells are big enough for them to read as borders.
        const b = s >= 6 ? Math.max(1, s * 0.06) : 0;
        const [r, g, bl] = COLORS.cell;
        this.life.forEachCell((x, y, state) => {
            if (x < x0 - 1 || x > x1 || y < y0 - 1 || y > y1) return;
            let a = 1;
            if (state === BORN) a = fade;
            else if (state === DYING) a = 1 - fade;
            if (a <= 0) return;
            const px = w / 2 + (x - this.cx) * s, py = h / 2 + (y - this.cy) * s;
            ctx.globalAlpha = a;
            if (b > 0) {
                ctx.fillStyle = COLORS.border;
                ctx.fillRect(px, py, s, s);
                ctx.fillStyle = `rgb(${r},${g},${bl})`;
                ctx.fillRect(px + b, py + b, s - 2 * b, s - 2 * b);
            } else {
                ctx.fillStyle = `rgb(${r},${g},${bl})`;
                ctx.fillRect(px, py, Math.max(s, 1), Math.max(s, 1));
            }
        });
        ctx.globalAlpha = 1;
    }

    drawGrid(ctx, w, h) {
        const s = this.cellPx;
        const ox = ((w / 2 - this.cx * s) % s + s) % s;
        const oy = ((h / 2 - this.cy * s) % s + s) % s;
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = ox; x <= w; x += s) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
        for (let y = oy; y <= h; y += s) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
        ctx.stroke();
    }
}

// When generations happen and how far the fade has gone.
//
// Running: `rate` generations per second. A single step (Space) is animated
// the same way. The fade lasts 2/3 of a generation period, as in the Qt
// version, but never more than FADE_MAX seconds: a slow run would otherwise
// look like a slide show of half-transparent cells.
const FADE_MAX = 0.5;

export class LifeClock {
    constructor(life, rate = 2) {
        this.life = life;
        this.rate = rate;
        this.running = false;
        this.phase = 1;          // time since the last generation, in periods
        this.fadeTime = 1e9;     // seconds since the last generation
        this.onStep = null;      // called after every generation
        this.stopWhen = null;    // (generation) => true to stop right after it
    }

    step() {
        this.life.step();
        this.phase = 0;
        this.fadeTime = 0;
        if (this.onStep) this.onStep(this.life.generation);
        if (this.stopWhen && this.stopWhen(this.life.generation)) {
            this.running = false;
            this.stopWhen = null;
        }
    }

    toggle() {
        this.running = !this.running;
        if (this.running) this.phase = 1;   // first generation at once
    }

    update(dt) {
        this.fadeTime += dt;
        if (!this.running) return;
        this.phase += dt * this.rate;
        // At high rates several generations can fall in one frame.
        let n = 0;
        while (this.phase >= 1 && this.running && n < 1000) {
            this.phase -= 1;
            this.step();
            this.phase = Math.min(this.phase, 0.999);
            n++;
            if (this.rate <= 60) break;
        }
    }

    get fade() {
        // A single step while stopped gets the full fade whatever the rate.
        const d = this.running ? Math.min(FADE_MAX, (2 / 3) / this.rate) : FADE_MAX;
        return Math.min(1, this.fadeTime / d);
    }
}

// Mouse on a LifeView: left button draws cells (the first cell decides
// whether the stroke draws or erases), right button drags the view, the wheel
// zooms around the pointer.
export class LifeMouse {
    constructor(view, sc, {edit = true} = {}) {
        this.view = view;
        this.sc = sc;
        this.edit = edit;
        this.mode = null;
    }

    cellAt(p) {
        const q = this.view.toWorld(p, this.sc.width, this.sc.height);
        return [Math.floor(q.x), Math.floor(q.y)];
    }

    down(p, e) {
        this.last = p;
        if (e.button === 0 && this.edit) {
            const [x, y] = this.cellAt(p);
            this.paint = this.view.life.get(x, y) ? 0 : 1;
            this.view.life.set(x, y, this.paint);
            this.mode = 'paint';
        } else {
            this.mode = 'pan';
        }
    }

    move(p) {
        if (this.mode === 'paint') {
            const [x, y] = this.cellAt(p);
            this.view.life.set(x, y, this.paint);
        } else if (this.mode === 'pan') {
            this.view.panPixels(p.x - this.last.x, p.y - this.last.y);
        }
        this.last = p;
    }

    up() {
        this.mode = null;
    }

    wheel(p, e) {
        this.view.zoomAt(p, Math.exp(-e.deltaY * 0.0015), this.sc.width, this.sc.height);
    }
}
