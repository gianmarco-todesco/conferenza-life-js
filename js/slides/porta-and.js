// Life as a computer: from the Gosper gun to an AND gate. Four acts:
//   0  the Gosper gun
//   1  two streams of gliders that meet and annihilate
//   2  the AND gate, A and B on: the guns are just off-screen
//   3  the channels (green when gliders flow, red when not), the lamp of the
//      receiver and the truth table
// The geometry is in js/life/and-gate.js, found and verified by the tools in
// tools/ (and-search, and-phases, and-verify).
//
// Keys: a / b switch the streams A and B on and off (in any act from 2 on),
// Enter start/stop, Space one generation, +/- speed.
// Mouse: drag pans, wheel zooms.

import {Slide, STAGE_W, STAGE_H} from '../core/stage.js';
import {SimpleLife, parseRLE} from '../life/simplelife.js';
import {LifeView, LifeClock, LifeMouse} from '../life/lifeview.js';
import {LAYOUT, eaterCells, switchReady, sensorHit} from '../life/and-gate.js';

const GUN = parseRLE('x = 36, y = 9\n24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o$2o8bo3bob2o4bobo$10bo5bo7bo$11bo3bo$12b2o!');
const RATES = [2, 5, 10, 20, 40, 60, 120, 240];

// Per act: camera (world center, cell size), speed (index in RATES).
const ACTS = [
    {cx: -20, cy: -50, cellPx: 14, rate: 2},  // gun B and the start of its stream
    {cx: 18, cy: -38, cellPx: 10, rate: 3},
    {cx: -10, cy: 0, cellPx: 9, rate: 5},
    {cx: -10, cy: 0, cellPx: 9, rate: 5},
];

// A channel is "active" if its sensor saw a glider in the last generations:
// a stream brings one every 30.
const ACTIVE_FOR = 45;

// Channels: strips along the lanes, from y0 to y1, colored by a sensor.
// 'se' lanes are x - y = c, 'sw' lanes x + y = c.
const CHANNELS = [
    {dir: 'se', c: LAYOUT.laneA, y0: -62, y1: LAYOUT.crossAT.y, sensor: 'A', label: 'A', labelY: -30},
    {dir: 'se', c: LAYOUT.laneA, y0: LAYOUT.crossAT.y, y1: LAYOUT.receiver.y, sensor: 'out'},
    {dir: 'se', c: LAYOUT.laneB, y0: -62, y1: LAYOUT.crossBT.y, sensor: 'B', label: 'B', labelY: -45},
    {dir: 'sw', c: LAYOUT.laneT, y0: -62, y1: LAYOUT.crossBT.y, sensor: 'T0', label: 'T', labelY: -45},
    {dir: 'sw', c: LAYOUT.laneT, y0: LAYOUT.crossBT.y, y1: LAYOUT.crossAT.y, sensor: 'T'},
];

const WARM_UP = 720;   // a multiple of 30 keeps the guns in phase 0

const GREEN = 'rgba(120,235,120,0.32)';
const RED = 'rgba(240,90,80,0.32)';

export class PortaAndSlide extends Slide {
    constructor() {
        super('porta-and', ACTS.length);
    }

    start() {
        this.sc = this.createCanvas();
        this.life = new SimpleLife();
        this.view = new LifeView(this.life, {grid: false});
        this.clock = new LifeClock(this.life);
        this.clock.onStep = g => this.onStep(g);
        this.mouse = new LifeMouse(this.view, this.sc, {edit: false});

        this.table = document.createElement('div');
        this.table.className = 'and-table';
        this.table.innerHTML = `<table>
            <tr><th>A</th><th>B</th><th>A e B</th></tr>
            ${[[0, 0], [0, 1], [1, 0], [1, 1]].map(([a, b]) =>
                `<tr data-row="${a}${b}"><td>${a}</td><td>${b}</td><td>${a & b}</td></tr>`).join('')}
        </table>`;
        this.layer.appendChild(this.table);
    }

    // Every act is rebuilt from generation 0: the switches rely on the phase
    // of the guns (generation mod 30).
    enterAct(n, previous) {
        const keep = n === 3 && previous === 2;
        if (!keep) this.build(n);
        const a = ACTS[n];
        if (!keep) this.view.setCamera(a.cx, a.cy, a.cellPx);
        this.setRate(a.rate);
        this.clock.running = true;
        this.table.classList.toggle('visible', n === 3);
    }

    build(n) {
        const life = this.life;
        life.clear();
        this.on = {A: true, B: true};
        this.pending = {};
        this.lastSeen = {};
        const gun = g => life.place(GUN, g.x, g.y, {flipX: g.flipX});
        const eater = e => { for (const [x, y] of eaterCells(e)) life.set(x, y, 1); };
        if (n === 0) {
            // Gun B alone, with the receiver's eater moved onto its lane (the
            // same relative position as the receiver has to gun A).
            gun(LAYOUT.gunB);
            eater({...LAYOUT.receiver, x: LAYOUT.receiver.x + LAYOUT.gunB.x - LAYOUT.gunA.x});
        } else if (n === 1) {
            gun(LAYOUT.gunB);
            gun(LAYOUT.gunT);
        } else {
            gun(LAYOUT.gunA);
            gun(LAYOUT.gunB);
            gun(LAYOUT.gunT);
            eater(LAYOUT.receiver);
            eater(LAYOUT.endT);
            // The gate appears already working: the first glider of A needs
            // some 500 generations to reach the receiver. The generation count
            // goes on, so the phases of the switches stay right.
            for (let i = 0; i < WARM_UP; i++) life.step();
        }
        life.settle();
    }

    // After every generation: pending switches, then the sensors.
    onStep(g) {
        for (const k of ['A', 'B']) {
            if (this.pending[k] === undefined) continue;
            const on = this.pending[k];
            if (!switchReady(g, on)) continue;
            const e = k === 'A' ? LAYOUT.switchA : LAYOUT.switchB;
            for (const [x, y] of eaterCells(e)) this.life.set(x, y, on ? 0 : 1);
            this.on[k] = on;
            delete this.pending[k];
        }
        for (const [k, s] of Object.entries(LAYOUT.sensors))
            if (sensorHit(this.life, s)) this.lastSeen[k] = g;
    }

    active(k) {
        const g = this.lastSeen[k];
        return g !== undefined && this.life.generation - g < ACTIVE_FOR;
    }

    setRate(i) {
        this.rateIndex = Math.max(0, Math.min(RATES.length - 1, i));
        this.clock.rate = RATES[this.rateIndex];
    }

    onKey(e) {
        switch (e.key) {
            case 'a': case 'A': case 'b': case 'B': {
                if (this.act < 2) return true;
                const k = e.key.toUpperCase();
                // A second press before the switch happened cancels it.
                const target = this.pending[k] === undefined ? !this.on[k] : !this.pending[k];
                if (target === this.on[k]) delete this.pending[k];
                else this.pending[k] = target;
                return true;
            }
            case 'Enter': this.clock.toggle(); return true;
            case ' ': if (!this.clock.running) this.clock.step(); return true;
            case '+': this.setRate(this.rateIndex + 1); return true;
            case '-': this.setRate(this.rateIndex - 1); return true;
        }
        return false;
    }

    onPointerDown(p, e) { this.mouse.down(p, e); }
    onPointerMove(p) { this.mouse.move(p); }
    onPointerUp() { this.mouse.up(); }
    onWheel(p, e) { this.mouse.wheel(p, e); }

    update(dt) {
        this.clock.update(dt);
        this.view.render(this.sc, this.clock.fade);
        if (this.act >= 2) this.drawLamp();
        if (this.act === 3) { this.drawChannels(); this.updateTable(); }
    }

    // --- drawing ----------------------------------------------------------

    toScreen(x, y) {
        return this.view.toScreen(x, y, STAGE_W, STAGE_H);
    }

    drawChannels() {
        const ctx = this.sc.ctx;
        const hw = 3;   // half width, in cells, measured horizontally
        ctx.font = 'bold 44px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        for (const ch of CHANNELS) {
            const xAt = y => (ch.dir === 'se' ? ch.c + y : ch.c - y) + 0.5;
            const pts = [[xAt(ch.y0) - hw, ch.y0], [xAt(ch.y0) + hw, ch.y0], [xAt(ch.y1) + hw, ch.y1], [xAt(ch.y1) - hw, ch.y1]]
                .map(([x, y]) => this.toScreen(x, y));
            ctx.fillStyle = this.active(ch.sensor) ? GREEN : RED;
            ctx.beginPath();
            pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
            ctx.closePath();
            ctx.fill();
            if (ch.label) {
                // Beside the strip, on the outer side.
                const y = ch.labelY;
                const p = this.toScreen(xAt(y) + (ch.dir === 'se' ? -6 : 6), y + 6);
                ctx.fillStyle = 'white';
                ctx.fillText(ch.label, p.x, p.y);
            }
        }
    }

    // A lamp beside the receiver, lit while gliders arrive.
    drawLamp() {
        const ctx = this.sc.ctx;
        const r = LAYOUT.receiver;
        const p = this.toScreen(r.x + 11, r.y + 2);
        const radius = 2.2 * this.view.cellPx;
        const on = this.active('out');
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
        if (on) {
            ctx.shadowColor = 'rgba(255,230,90,0.9)';
            ctx.shadowBlur = radius * 1.5;
        }
        ctx.fillStyle = on ? 'rgb(255,225,80)' : 'rgb(60,66,72)';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgb(30,30,30)';
        ctx.stroke();
    }

    // The highlighted row is the state the gliders have actually reached,
    // read from the sensors, not from the keys.
    updateTable() {
        const row = (this.active('A') ? '1' : '0') + (this.active('B') ? '1' : '0');
        for (const tr of this.table.querySelectorAll('tr[data-row]'))
            tr.classList.toggle('current', tr.dataset.row === row);
    }
}
