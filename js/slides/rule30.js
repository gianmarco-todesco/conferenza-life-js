// Rule 30: a one-dimensional cellular automaton, built one cell at a time.
// Time runs downwards on the screen. At the bottom, the rule: the 8 triples
// with their outcome. The state machine is in js/life/rule30.js.
//
// Keys: Space one cell (then one row), → finish the row (then one row),
// ← back one row, 0 restart, t show everything, l labels 0/1, n the rule
// read as a binary number. Mouse: drag pans, wheel zooms.

import {Slide, STAGE_W, STAGE_H} from '../core/stage.js';
import {Rule30Model, RULE, X0, X1, MANUAL_ROWS, WELD_RISE, WELD_SHIFT} from '../life/rule30.js';

const ON = 'rgb(231,138,25)';
const OFF = 'rgb(255,255,255)';
const BG = 'rgb(100,120,130)';
const LINE = 'rgb(0,0,0)';

const CELL_PX = 36;
// Where the row under construction appears: 3 rows under the triangle.
const NEW_ROW_Y = 3;
// In fast mode the view moves down a little at each row, as in the Qt version
// (10 px per row up to 200 px on a 1024x768 window).
const DRIFT_PER_ROW = 14;
const DRIFT_MAX = 280;
// The rule panel at the bottom: cell size and the top of the triples.
const RU = 30;
const RULE_TOP = 912;
const RULE_LEFT = STAGE_W / 2 - 31 * RU / 2;
// The area the triangle is fitted into by 't', above the rule panel.
const FIT = {x0: 30, y0: 30, x1: STAGE_W - 30, y1: 850};

const ease = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export class Rule30Slide extends Slide {
    constructor() {
        super('rule30');
        this.model = new Rule30Model();
    }

    start() {
        this.sc = this.createCanvas();
    }

    enterAct() {
        this.model.reset();
        this.cam = {cx: 0.5, cy: 0.5, s: CELL_PX};
        this.camAnim = null;
        this.drift = 0;
        this.showLabels = true;
        this.showNumber = false;
        this.drag = null;
    }

    next() { this.model.forward(); return true; }
    prev() { this.model.back(); return true; }

    onKey(e) {
        switch (e.key) {
            case ' ': this.model.space(); return true;
            case 't': case 'T': this.fitAll(); return true;
            case 'l': case 'L': this.showLabels = !this.showLabels; return true;
            case 'n': case 'N': this.showNumber = !this.showNumber; return true;
        }
        return false;
    }

    // --- camera -----------------------------------------------------------

    sx(x) { return STAGE_W / 2 + (x - this.cam.cx) * this.cam.s; }
    sy(y) { return STAGE_H / 2 + (y - this.cam.cy) * this.cam.s + this.drift; }

    fitAll() {
        const m = this.model.m;
        const fast = this.model.mode === 'fast';
        const bx0 = fast ? -m : X0, bx1 = fast ? m + 1 : X1 + 1;
        const by0 = -m, by1 = fast ? 1 : NEW_ROW_Y + 1;
        const s = Math.min((FIT.x1 - FIT.x0) / (bx1 - bx0), (FIT.y1 - FIT.y0) / (by1 - by0), 60);
        const to = {
            s,
            cx: (bx0 + bx1) / 2 + (STAGE_W / 2 - (FIT.x0 + FIT.x1) / 2) / s,
            cy: (by0 + by1) / 2 + (STAGE_H / 2 + this.drift - (FIT.y0 + FIT.y1) / 2) / s,
        };
        this.camAnim = {from: {...this.cam}, to, t: 0, dur: 0.7};
    }

    onPointerDown(p) { this.drag = p; this.camAnim = null; }
    onPointerMove(p) {
        if (!this.drag) return;
        this.cam.cx -= (p.x - this.drag.x) / this.cam.s;
        this.cam.cy -= (p.y - this.drag.y) / this.cam.s;
        this.drag = p;
    }
    onPointerUp() { this.drag = null; }
    onWheel(p, e) {
        this.camAnim = null;
        const wx = this.cam.cx + (p.x - STAGE_W / 2) / this.cam.s;
        const wy = this.cam.cy + (p.y - STAGE_H / 2 - this.drift) / this.cam.s;
        this.cam.s = Math.max(1, Math.min(120, this.cam.s * Math.exp(-e.deltaY * 0.0015)));
        this.cam.cx = wx - (p.x - STAGE_W / 2) / this.cam.s;
        this.cam.cy = wy - (p.y - STAGE_H / 2 - this.drift) / this.cam.s;
    }

    // --- animation --------------------------------------------------------

    update(dt) {
        this.model.update(dt);
        if (this.camAnim) {
            const a = this.camAnim;
            a.t += dt;
            const k = ease(a.t / a.dur);
            for (const f of ['s', 'cx', 'cy']) this.cam[f] = a.from[f] + (a.to[f] - a.from[f]) * k;
            if (a.t >= a.dur) this.camAnim = null;
        }
        const m = this.model.m;
        const target = this.model.mode === 'fast' ? Math.min(DRIFT_MAX, DRIFT_PER_ROW * (m - MANUAL_ROWS)) : 0;
        this.drift += (target - this.drift) * Math.min(1, dt * 8);
        this.draw();
    }

    // --- drawing ----------------------------------------------------------

    draw() {
        const ctx = this.sc.ctx;
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, STAGE_W, STAGE_H);
        const md = this.model;
        if (md.mode === 'fast') this.drawTriangle(md.m, 0);
        else this.drawConstruction();
        this.drawRule();
    }

    // Rows 0..last of the triangle, without borders; row `last` is drawn at
    // height -shift and the older ones above it.
    drawTriangle(last, shift) {
        const ctx = this.sc.ctx;
        const s = this.cam.s;
        // Cells overlap by a fraction of a pixel, or seams show between them.
        const e = 0.5;
        for (let k = 0; k <= last; k++) {
            const y = this.sy(-(last - k) - shift);
            if (y > STAGE_H || y + s < 0) continue;
            const row = this.model.row(k);
            for (let x = -k; x <= k; x++) {
                const px = this.sx(x);
                if (px > STAGE_W || px + s < 0) continue;
                ctx.fillStyle = row[x + k] ? ON : OFF;
                ctx.fillRect(px, y, s + e, s + e);
            }
        }
    }

    drawConstruction() {
        const md = this.model;
        const m = md.m;
        let newY = NEW_ROW_Y, shift = 0;
        if (md.mode === 'weld') {
            newY = NEW_ROW_Y - (NEW_ROW_Y - 1) * ease(md.weldT / WELD_RISE);
            shift = ease((md.weldT - WELD_RISE) / WELD_SHIFT);
        }
        if (m > 0) this.drawTriangle(m - 1, 1 + shift);
        this.drawStrip(x => md.cell(m, x), X0, X1, -shift, 1);
        // The empty places of the new row, then its cells so far.
        if (md.mode !== 'weld') this.drawStrip(null, md.c + 1, X1, newY - shift, 0.25);
        if (md.c >= X0) this.drawStrip(x => md.cell(m + 1, x), X0, md.c, newY - shift, 1);
        if (md.windowVisible) this.drawWindow(md.c, newY);
    }

    // Cells x0..x1 of a row at height y, with borders. value(x) gives the
    // color; without it only the outlines are drawn, at the given opacity.
    drawStrip(value, x0, x1, y, alpha) {
        if (x1 < x0) return;
        const ctx = this.sc.ctx;
        const s = this.cam.s, py = this.sy(y);
        if (value) {
            for (let x = x0; x <= x1; x++) {
                ctx.fillStyle = value(x) ? ON : OFF;
                ctx.fillRect(this.sx(x), py, s, s);
            }
        }
        if (s < 5) return;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = LINE;
        ctx.lineWidth = Math.max(1, s * 0.04);
        ctx.beginPath();
        ctx.moveTo(this.sx(x0), py); ctx.lineTo(this.sx(x1 + 1), py);
        ctx.moveTo(this.sx(x0), py + s); ctx.lineTo(this.sx(x1 + 1), py + s);
        for (let x = x0; x <= x1 + 1; x++) { ctx.moveTo(this.sx(x), py); ctx.lineTo(this.sx(x), py + s); }
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // The window: a frame on the three cells of the current row and a triangle
    // pointing at the new cell.
    drawWindow(c, newY) {
        const ctx = this.sc.ctx;
        const s = this.cam.s;
        // Dark: most of the cells it frames are white.
        ctx.strokeStyle = 'rgb(20,30,40)';
        ctx.lineWidth = Math.max(2, s * 0.12);
        ctx.strokeRect(this.sx(c - 1), this.sy(0), 3 * s, s);
        ctx.fillStyle = OFF;
        ctx.beginPath();
        ctx.moveTo(this.sx(c - 1), this.sy(1.3));
        ctx.lineTo(this.sx(c + 2), this.sy(1.3));
        ctx.lineTo(this.sx(c + 0.5), this.sy(newY - 0.3));
        ctx.closePath();
        ctx.fill();
    }

    drawRule() {
        const ctx = this.sc.ctx;
        const md = this.model;
        const current = md.windowVisible ? md.triple(md.c) : -1;
        // A band behind the panel, so that a zoomed triangle does not run into it.
        ctx.fillStyle = 'rgba(100,120,130,0.85)';
        ctx.fillRect(0, RULE_TOP - 70, STAGE_W, STAGE_H - RULE_TOP + 70);
        ctx.font = `bold ${Math.round(RU * 0.8)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Wolfram's order, from 111 on the left to 000 on the right, so that
        // the outcomes read left to right are the binary digits of 30.
        for (let d = 0; d < 8; d++) {
            const v = 7 - d;
            const left = RULE_LEFT + d * 4 * RU;
            for (let j = 0; j < 3; j++) {
                const bit = (v >> (2 - j)) & 1;
                this.ruleCell(left + j * RU, RULE_TOP, bit);
                if (this.showLabels) this.label(bit, left + (j + 0.5) * RU, RULE_TOP - 0.55 * RU);
            }
            const out = RULE[v];
            this.ruleCell(left + RU, RULE_TOP + 3 * RU, out);
            if (this.showLabels) this.label(out, left + 1.5 * RU, RULE_TOP + 4.6 * RU);
            ctx.beginPath();
            ctx.moveTo(left, RULE_TOP + 1.3 * RU);
            ctx.lineTo(left + 3 * RU, RULE_TOP + 1.3 * RU);
            ctx.lineTo(left + 1.5 * RU, RULE_TOP + 2.7 * RU);
            ctx.closePath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = OFF;
            ctx.stroke();
            if (v === current) {
                ctx.fillStyle = OFF;
                ctx.fill();
                ctx.lineWidth = 4;
                ctx.strokeRect(left - 6, RULE_TOP - 6, 3 * RU + 12, 4 * RU + 12);
            }
        }
        if (this.showNumber) this.drawNumber();
    }

    ruleCell(x, y, bit) {
        const ctx = this.sc.ctx;
        ctx.fillStyle = bit ? ON : OFF;
        ctx.fillRect(x, y, RU, RU);
        ctx.strokeStyle = LINE;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, RU, RU);
    }

    label(bit, x, y) {
        this.sc.ctx.fillStyle = OFF;
        this.sc.ctx.fillText(String(bit), x, y);
    }

    // The outcomes in a row, each digit in the color of its cell, = 30.
    drawNumber() {
        const ctx = this.sc.ctx;
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        let x = RULE_LEFT + 31 * RU + 50;
        const y = RULE_TOP + 3.5 * RU;
        for (let d = 0; d < 8; d++) {
            const out = RULE[7 - d];
            ctx.fillStyle = out ? ON : OFF;
            ctx.fillText(String(out), x, y);
            x += ctx.measureText(String(out)).width;
        }
        ctx.fillStyle = OFF;
        ctx.fillText(' = 30', x, y);
    }
}
