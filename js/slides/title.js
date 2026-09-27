// Title slide: eight Kok's galaxies (a period-8 oscillator), one in each
// phase, under the title. The same figure returns at the end of the talk,
// built out of metapixels.
//
// Keys: Enter start/stop, Space one generation, +/- speed, 1 default speed,
// s stop on the next "nice" frame (generation 4 mod 8, as in the Qt version).
// Mouse: left draws cells, right drags, wheel zooms.

import {Slide} from '../core/stage.js';
import {SimpleLife, parseRLE} from '../life/simplelife.js';
import {LifeView, LifeClock, LifeMouse} from '../life/lifeview.js';

const GALAXY = parseRLE('x = 9, y = 9\n6ob2o$6ob2o$7b2o$2o5b2o$2o5b2o$2o5b2o$2o$2ob6o$2ob6o!');
const RATES = [0.5, 1.25, 2.5, 5, 10, 20];
const DEFAULT_RATE = 1;
const CELL_PX = 22;

export class TitleSlide extends Slide {
    constructor() {
        super('title');
    }

    start() {
        this.sc = this.createCanvas();
        this.life = new SimpleLife();
        this.view = new LifeView(this.life);
        this.clock = new LifeClock(this.life);
        this.mouse = new LifeMouse(this.view, this.sc);

        const text = document.createElement('div');
        text.className = 'title-text';
        text.innerHTML = `
            <div class="t-life">LIFE</div>
            <div class="t-sub">Il gioco della vita</div>
            <div class="t-conway">John Conway, 1970</div>
            <div class="t-name">Gian Marco Todesco</div>
            <div class="t-mail">gianmarco.todesco@gmail.com</div>`;
        this.layer.appendChild(text);
    }

    enterAct() {
        this.life.clear();
        // Placed and stepped one at a time, as TitlePage did: galaxy i has been
        // through 8 - i generations, so the eight of them show all the phases.
        // The positions are the Qt ones, flipped to y pointing down, with the
        // C++ truncation of the double to int.
        for (let i = 0; i < 8; i++) {
            const x = Math.trunc(((i % 4) - 1.4) * 16 - 8);
            const yUp = -6 - Math.floor(i / 4) * 16;
            this.life.place(GALAXY, x, -(yUp + 8));
            this.life.step();
        }
        this.life.settle();
        this.rateIndex = DEFAULT_RATE;
        this.clock.rate = RATES[this.rateIndex];
        this.clock.running = false;
        this.clock.stopWhen = null;
        // Galaxies span x in [-30, 26) and y in [-2, 23); their center goes
        // at (960, 720) on the stage, below the text.
        this.view.setCamera(-2, 10.5 - 180 / CELL_PX, CELL_PX);
    }

    onKey(e) {
        switch (e.key) {
            case 'Enter': this.clock.toggle(); this.clock.stopWhen = null; return true;
            case ' ': if (!this.clock.running) this.clock.step(); return true;
            case '+': this.setRate(this.rateIndex + 1); return true;
            case '-': this.setRate(this.rateIndex - 1); return true;
            case '1': this.setRate(DEFAULT_RATE); return true;
            case 's': case 'S':
                if (this.clock.running) this.clock.stopWhen = g => g % 8 === 4;
                return true;
        }
        return false;
    }

    setRate(i) {
        this.rateIndex = Math.max(0, Math.min(RATES.length - 1, i));
        this.clock.rate = RATES[this.rateIndex];
    }

    onPointerDown(p, e) { this.mouse.down(p, e); }
    onPointerMove(p) { this.mouse.move(p); }
    onPointerUp() { this.mouse.up(); }
    onWheel(p, e) { this.mouse.wheel(p, e); }

    update(dt) {
        this.clock.update(dt);
        this.view.render(this.sc, this.clock.fade);
    }
}
