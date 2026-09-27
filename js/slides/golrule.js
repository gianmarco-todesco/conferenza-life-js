// The rules of Life, in four acts:
//   0  an empty grid to draw on
//   1  the same cells with their neighbours counted, births in green and
//      deaths in red, before the rule is applied
//   2  the first patterns, one per →: block, blinker, glider, R-pentomino
//   3  free Life
//
// Keys: Space one generation, Enter start/stop, +/- speed, r random fill,
// Delete clear, g grid, e left button draws / drags.
// Mouse: left draws (or drags, after e), right drags, wheel zooms.

import {Slide} from '../core/stage.js';
import {SimpleLife, parseRLE} from '../life/simplelife.js';
import {LifeView, LifeClock, LifeMouse} from '../life/lifeview.js';

const RATES = [0.5, 1, 2, 4, 8, 15, 30, 60];

// Per act: cell size, default speed (an index in RATES).
const ACTS = [
    {cellPx: 48, rate: 1},
    {cellPx: 48, rate: 0},
    {cellPx: 24, rate: 3},
    {cellPx: 14, rate: 4},
];

const GLIDER = parseRLE('bo$2bo$3o!');

// The collection of act 2. The glider is flipped so that it flies up-left,
// away from the R-pentomino, whose debris spreads for a thousand generations.
const PATTERNS = [
    {name: 'blocco', rle: '2o$2o!', x: -30, y: -1},
    {name: 'blinker', rle: '3o!', x: -14, y: 0},
    {name: 'glider', rle: 'bo$2bo$3o!', x: 1, y: -1, flip: true},
    {name: 'R-pentomino', rle: 'b2o$2o$bo!', x: 20, y: -1},
].map(p => ({...p, pattern: parseRLE(p.rle)}));

// Generations the names of act 2 stay, and then take to fade out.
const NAMES_FOR = 20;
const NAMES_FADE = 10;

const BIRTH = 'rgba(60,200,80,0.75)';
const DEATH = 'rgba(230,60,50,0.75)';

export class GolRuleSlide extends Slide {
    constructor() {
        super('golrule', ACTS.length);
    }

    start() {
        this.sc = this.createCanvas();
        this.life = new SimpleLife();
        this.view = new LifeView(this.life, {grid: true});
        this.clock = new LifeClock(this.life);
        this.mouse = new LifeMouse(this.view, this.sc);

        this.legend = document.createElement('div');
        this.legend.className = 'rule-legend';
        this.legend.innerHTML = `
            <div>Una cella viva con <b>2</b> o <b>3</b> vicini sopravvive, altrimenti <span class="death">muore</span>.</div>
            <div>Una cella vuota con esattamente <b>3</b> vicini <span class="birth">nasce</span>.</div>`;
        this.layer.appendChild(this.legend);
    }

    enterAct(n, previous) {
        const keep = previous === n - 1;   // moving forward keeps the cells
        this.clock.running = false;
        this.shown = 0;
        this.named = 0;
        if (n === 0) {
            this.life.clear();
        } else if (n === 1) {
            // Something to count, if nothing was drawn in act 0.
            if (!keep || this.life.population === 0) {
                this.life.clear();
                this.life.place(GLIDER, -1, -1);
            }
        } else if (n === 2) {
            this.life.clear();
            // Forward: patterns appear one per →. Back from act 3 or a reload:
            // all of them.
            this.showPatterns(keep ? 1 : PATTERNS.length);
        } else if (n === 3) {
            if (!keep) this.randomFill(40);
        }
        this.life.settle();
        const a = ACTS[n];
        // From act 0 to act 1 the view stays where the drawing was made.
        if (!(n === 1 && keep)) this.view.setCamera(n === 2 ? -3 : 0, 0, a.cellPx);
        this.setRate(a.rate);
        this.legend.classList.toggle('visible', n === 1);
    }

    showPatterns(count) {
        for (let i = this.shown; i < count; i++) {
            const p = PATTERNS[i];
            this.life.place(p.pattern, p.x, p.y, {flipX: p.flip, flipY: p.flip});
        }
        this.shown = this.named = count;
        this.namedAt = this.life.generation;
    }

    next() {
        if (this.act === 2 && this.shown < PATTERNS.length) {
            this.showPatterns(this.shown + 1);
            return true;
        }
        return false;
    }

    endCollection() {
        this.shown = PATTERNS.length;
        this.named = 0;
    }

    randomFill(r) {
        for (let y = -r; y < r; y++)
            for (let x = -2 * r; x < 2 * r; x++)
                this.life.set(x, y, Math.random() < 0.35 ? 1 : 0);
    }

    setRate(i) {
        this.rateIndex = Math.max(0, Math.min(RATES.length - 1, i));
        this.clock.rate = RATES[this.rateIndex];
    }

    onKey(e) {
        switch (e.key) {
            case ' ': if (!this.clock.running) this.clock.step(); return true;
            case 'Enter': this.clock.toggle(); return true;
            case '+': this.setRate(this.rateIndex + 1); return true;
            case '-': this.setRate(this.rateIndex - 1); return true;
            // Both end the collection of act 2: → goes on to act 3, and the
            // names no longer stand under their patterns.
            case 'r': case 'R': this.randomFill(40); this.endCollection(); return true;
            case 'Delete': case 'Backspace': this.life.clear(); this.endCollection(); return true;
            case 'g': case 'G': this.view.grid = !this.view.grid; return true;
            case 'e': case 'E': this.mouse.edit = !this.mouse.edit; return true;
        }
        return false;
    }

    onPointerDown(p, e) { this.mouse.down(p, e); }
    onPointerMove(p) { this.mouse.move(p); }
    onPointerUp() { this.mouse.up(); }
    onWheel(p, e) { this.mouse.wheel(p, e); }

    update(dt) {
        this.clock.update(dt);
        const fade = this.clock.fade;
        this.view.render(this.sc, fade);
        // The counts describe the cells on screen, so they wait for the fade.
        if (this.act === 1 && fade >= 1) this.drawCounts();
        if (this.act === 2) this.drawNames();
    }

    drawCounts() {
        const {ctx, width: w, height: h} = this.sc;
        const s = this.view.cellPx;
        if (s < 16) return;
        ctx.font = `bold ${Math.round(s * 0.55)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        this.life.forEachCount((x, y, n, alive) => {
            const p = this.view.toScreen(x, y, w, h);
            if (p.x < -s || p.y < -s || p.x > w || p.y > h) return;
            const born = !alive && n === 3;
            const dies = alive && (n < 2 || n > 3);
            if (born || dies) {
                ctx.fillStyle = born ? BIRTH : DEATH;
                ctx.fillRect(p.x + 2, p.y + 2, s - 4, s - 4);
            }
            ctx.fillStyle = alive && !dies ? 'rgb(30,30,30)' : 'white';
            ctx.fillText(String(n), p.x + s / 2, p.y + s / 2 + 1);
        });
    }

    drawNames() {
        const {ctx, width: w, height: h} = this.sc;
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        // The names fade out after a while: the R-pentomino's debris would
        // soon cover its own.
        const age = this.life.generation - this.namedAt;
        const alpha = Math.max(0, Math.min(1, 1 - (age - NAMES_FOR) / NAMES_FADE));
        if (alpha <= 0) return;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'white';
        for (let i = 0; i < this.named; i++) {
            const p = PATTERNS[i];
            const q = this.view.toScreen(p.x + p.pattern.w / 2, p.y + p.pattern.h + 1.5, w, h);
            ctx.fillText(p.name, q.x, q.y);
        }
        ctx.globalAlpha = 1;
    }
}
