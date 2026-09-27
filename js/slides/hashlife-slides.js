// The last slides: huge patterns computed with HashLife.
//
//   cannone-p416  the 2c5 spaceship gun p416: the first really complex pattern
//   life-in-life  Kok's galaxy made of OTCA metapixels: Life simulated by Life
//   ticker        a scrolling text made of spaceships
//
// Keys: Enter start/stop, Space one step, +/- speed, t show everything,
// 0 back to the start. In life-in-life, s runs to the next synchronization
// point and stops there. Mouse: drag pans, wheel zooms.
//
// Each act of a slide is a camera position (and a speed): → flies there.

import {Slide, STAGE_W, STAGE_H} from '../core/stage.js';
import {HashLife} from '../life/hashlife.js';
import {HashView, SPEEDS} from '../life/hashview.js';
import {loadPattern} from '../life/patterns.js';

// Speeds are indices in SPEEDS: 3 is one generation per frame.
const ONE_PER_FRAME = 3;

class HashSlide extends Slide {
    // acts: [{cam: {cx, cy, scale} | 'fit', speed}]
    constructor(name, file, acts, loadOptions = {}) {
        super(name, acts.length);
        this.file = file;
        this.acts = acts;
        this.loadOptions = loadOptions;
    }

    start() {
        this.sc = this.createCanvas();
        this.hud = document.createElement('div');
        this.hud.className = 'hash-hud';
        this.layer.appendChild(this.hud);
        this.life = null;
        this.view = null;
        this.loading = fetch('assets/patterns/' + this.file)
            .then(r => { if (!r.ok) throw new Error(r.status + ' ' + this.file); return r.text(); })
            .then(text => { this.text = text; this.reload(); })
            .catch(e => { this.hud.textContent = 'errore: ' + e.message; });
    }

    stop() {
        // Millions of nodes: let them go as soon as the slide is left.
        this.life = null;
        this.view = null;
    }

    reload() {
        this.life = new HashLife();
        loadPattern(this.life, this.file, this.text, this.loadOptions);
        this.view = new HashView(this.life);
        this.view.onStop = () => this.onStopped();
        this.goToAct(this.act, false);
    }

    enterAct(n, previous) {
        if (!this.view) return;       // still loading: reload() applies the act
        // '0' on act 0 restarts from generation 0; coming back to act 0 with
        // ← only moves the camera, the pattern goes on.
        if (n === 0 && previous <= 0) { this.reload(); return; }
        this.goToAct(n, previous >= 0);
    }

    goToAct(n, animated) {
        const a = this.acts[n];
        const c = a.cam === 'fit'
            ? this.view.fitBox(this.life.boundingBox(), STAGE_W, STAGE_H)
            : a.cam;
        if (animated) this.view.flyTo(c.cx, c.cy, c.scale, a.flight || 2);
        else this.view.setCamera(c.cx, c.cy, c.scale);
        if (a.speed !== undefined) this.view.setSpeed(a.speed);
    }

    onStopped() {}

    onKey(e) {
        const v = this.view;
        if (!v) return false;
        switch (e.key) {
            case 'Enter': v.running = !v.running; if (!v.running) v.target = null; return true;
            case ' ': if (!v.running) v.stepOnce(); return true;
            case '+': v.setSpeed(v.speed + 1); return true;
            case '-': v.setSpeed(v.speed - 1); return true;
            case 't': case 'T': v.fitAll(STAGE_W, STAGE_H); return true;
        }
        return false;
    }

    onPointerDown(p) { this.drag = p; }
    onPointerMove(p) {
        if (!this.drag || !this.view) return;
        this.view.panPixels(p.x - this.drag.x, p.y - this.drag.y);
        this.drag = p;
    }
    onPointerUp() { this.drag = null; }
    onWheel(p, e) {
        if (this.view) this.view.zoomAt(p, Math.exp(-e.deltaY * 0.0015), STAGE_W, STAGE_H);
    }

    update(dt) {
        if (!this.view) {
            if (!this.hud.textContent) this.hud.textContent = 'caricamento…';
            return;
        }
        this.view.update(dt);
        this.view.render(this.sc);
        this.drawHud();
    }

    drawHud() {
        const v = this.view;
        const sp = SPEEDS[v.speed];
        const rate = sp.every > 1 ? `1 ogni ${sp.every} fotogrammi` : `${(2 ** sp.k).toLocaleString('it-IT')} per fotogramma`;
        const text = `generazione ${this.life.generation.toLocaleString('it-IT')}  ·  ${rate}${v.running ? '' : '  ·  fermo'}`;
        if (this.hud.textContent !== text) this.hud.textContent = text;
    }
}

export class P416Slide extends HashSlide {
    constructor() {
        super('cannone-p416', '2c5-spaceship-gun-p416.rle', [
            {cam: 'fit', speed: ONE_PER_FRAME},
        ]);
    }
}

// OTCA metapixels are 2048x2048 cells and switch state every 35328
// generations. The Qt version stopped at 39000 to catch a metacell changing
// color; the synchronization points are that instant in every later period.
const METAPERIOD = 35328;
const FIRST_SYNC = 39000;

export class LifeInLifeSlide extends HashSlide {
    constructor() {
        super('life-in-life', 'metapixel-galaxy.mc', [
            // Close up on the edge of a metacell: the position of the Qt version.
            {cam: {cx: 2214, cy: -1928, scale: 12}, speed: ONE_PER_FRAME},
            // The whole metacell (column 9, row 7 of the 15x15 tiling).
            {cam: {cx: 3072, cy: -1024, scale: 0.45}, speed: ONE_PER_FRAME + 6, flight: 2.5},
            // The whole galaxy.
            {cam: 'fit', speed: ONE_PER_FRAME + 10, flight: 2.5},
        ]);
    }

    nextSync() {
        const g = this.life.generation;
        if (g < FIRST_SYNC) return FIRST_SYNC;
        return FIRST_SYNC + (Math.floor((g - FIRST_SYNC) / METAPERIOD) + 1) * METAPERIOD;
    }

    onKey(e) {
        if ((e.key === 's' || e.key === 'S') && this.view) {
            this.view.runTo(this.nextSync());
            return true;
        }
        return super.onKey(e);
    }
}

// The Qt viewer drew with y pointing up, so it showed every pattern upside
// down, and the ticker generator wrote its text upside down to make it read
// right there. Loaded flipped, it reads right here. (The gun and the galaxy
// are shown mirrored with respect to the Qt version; nobody can tell.)
export class TickerSlide extends HashSlide {
    constructor() {
        super('ticker', 'ticker.rle', [
            // The scrolling text, as framed by the Qt version (y flipped too).
            {cam: {cx: 13378, cy: -2535, scale: 14}, speed: ONE_PER_FRAME},
            // The whole of it: the guns on the right, the text flowing left.
            {cam: 'fit', speed: ONE_PER_FRAME + 1},
        ], {flipY: true});
    }
}
