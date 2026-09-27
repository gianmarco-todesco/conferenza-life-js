// The Belousov-Zhabotinsky reaction imitated by a cellular automaton.
//
//   bz-sim      the simulation on the whole stage
//   bz-fusione  a variant to be judged: the photo, then photo and simulation
//               side by side, then the simulation alone (one per →)
//
// Keys: Enter start/stop, Space one step, +/- speed, Delete restart.
// Mouse (bz-sim): wheel zooms, drag pans.
//
// The simulation is drawn at one pixel per cell in a small canvas that CSS
// scales up with smoothing: the waves look like a liquid, not like tiles.

import {Slide} from '../core/stage.js';
import {BZModel} from '../life/bz.js';

// 16:9, 6 stage pixels per cell. The Qt version had 300x300 cells and showed
// the central 140x100 or so at 7 pixels each on a 1024x768 window.
const GRID_W = 320;
const GRID_H = 180;
const SEED = 17;
const RATES = [5, 10, 25, 50];
const DEFAULT_RATE = 2;    // 25 steps per second: one per frame of the Qt timer

class BZRunner {
    constructor(parent) {
        this.model = new BZModel(GRID_W, GRID_H);
        this.canvas = document.createElement('canvas');
        this.canvas.width = GRID_W;
        this.canvas.height = GRID_H;
        this.canvas.className = 'bz-canvas';
        parent.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.image = this.ctx.createImageData(GRID_W, GRID_H);
        this.reset();
    }

    reset() {
        this.model.reset(SEED);
        this.running = false;
        this.rateIndex = DEFAULT_RATE;
        this.acc = 0;
        this.draw();
    }

    step() {
        this.model.step();
        this.draw();
    }

    update(dt) {
        if (!this.running) return;
        this.acc += dt * RATES[this.rateIndex];
        let n = 0;
        while (this.acc >= 1 && n < 4) { this.acc -= 1; this.model.step(); n++; }
        if (n === 4) this.acc = 0;   // a slow machine drops steps instead of piling them up
        if (n) this.draw();
    }

    draw() {
        this.model.paint(this.image);
        this.ctx.putImageData(this.image, 0, 0);
    }

    onKey(e) {
        switch (e.key) {
            case 'Enter': this.running = !this.running; return true;
            case ' ': if (!this.running) this.step(); return true;
            case '+': this.rateIndex = Math.min(RATES.length - 1, this.rateIndex + 1); return true;
            case '-': this.rateIndex = Math.max(0, this.rateIndex - 1); return true;
            case 'Delete': case 'Backspace': {
                const running = this.running;
                this.reset();
                this.running = running;
                return true;
            }
        }
        return false;
    }
}

export class BZSlide extends Slide {
    constructor() {
        super('bz-sim');
    }

    start() {
        this.bz = new BZRunner(this.layer);
    }

    enterAct() {
        this.bz.reset();
        this.zoom = 1;
        this.tx = 0;
        this.ty = 0;
        this.applyView();
    }

    applyView() {
        this.bz.canvas.style.transform = `translate(${this.tx}px, ${this.ty}px) scale(${this.zoom})`;
    }

    onKey(e) { return this.bz.onKey(e); }

    onPointerDown(p) { this.drag = p; }
    onPointerMove(p) {
        if (!this.drag) return;
        this.tx += p.x - this.drag.x;
        this.ty += p.y - this.drag.y;
        this.drag = p;
        this.applyView();
    }
    onPointerUp() { this.drag = null; }
    onWheel(p, e) {
        const f = Math.exp(-e.deltaY * 0.0015);
        const z = Math.max(1, Math.min(12, this.zoom * f));
        const k = z / this.zoom;
        // Keep the point under the pointer where it is.
        this.tx = p.x - (p.x - this.tx) * k;
        this.ty = p.y - (p.y - this.ty) * k;
        this.zoom = z;
        if (z === 1) { this.tx = 0; this.ty = 0; }
        this.applyView();
    }

    update(dt) { this.bz.update(dt); }
}

export class BZFusionSlide extends Slide {
    constructor() {
        super('bz-fusione', 3);
    }

    start() {
        this.layer.classList.add('bzf');
        const photo = document.createElement('div');
        photo.className = 'bzf-photo';
        photo.innerHTML = `<img src="assets/images/bz.png" draggable="false">
            <div class="bzf-label">la reazione</div>`;
        const sim = document.createElement('div');
        sim.className = 'bzf-sim';
        this.layer.append(photo, sim);
        this.bz = new BZRunner(sim);
        const label = document.createElement('div');
        label.className = 'bzf-label';
        label.textContent = 'la simulazione';
        sim.appendChild(label);
        this.caption = document.createElement('div');
        this.caption.className = 'caption';
        this.caption.textContent = 'Reazione di Belousov-Zhabotinsky';
        this.layer.appendChild(this.caption);
    }

    enterAct(n, previous) {
        this.layer.classList.remove('act0', 'act1', 'act2');
        this.layer.classList.add('act' + n);
        // The simulation starts when it appears, and keeps running into act 2.
        if (n === 0) this.bz.reset();
        else if (previous < 1) { this.bz.reset(); this.bz.running = true; }
        else this.bz.running = true;
    }

    onKey(e) { return this.bz.onKey(e); }
    update(dt) { if (this.act > 0) this.bz.update(dt); }
}
