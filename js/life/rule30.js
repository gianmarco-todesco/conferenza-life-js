// Rule 30 and the state machine of the Rule 30 slide, kept apart from the
// drawing so that it can be tested with node.
//
// Rows: row 0 is a single live cell at x = 0; row k spans x in [-k, k]. A
// cell's next value is RULE[4*left + 2*center + right].
//
// The slide builds rows 1 and 2 by hand, then adds whole rows:
//
//   ready   before the first Space: no window yet
//   scan    the window runs by itself over 000 triples, stops on the first other
//   manual  Space moves the window one cell; the new cell appears under it
//   finish  (→) the rest of the row is completed quickly...
//   weld    ...then the new row rises and joins the triangle
//   fast    from row 2 on: Space or → adds a whole row
//
// "m" is the bottom row of the triangle; the row under construction is m + 1.
// The cursor c is the x of the last new cell shown; the window covers the
// cells c-1, c, c+1 of row m.

export const RULE = [0, 1, 1, 1, 1, 0, 0, 0];   // 30 = 00011110: bit v is RULE[v]

// The strip of the rows under construction, as in the Qt version.
export const X0 = -50;
export const X1 = 49;
// Rows built by hand (the 2nd and the 3rd); after that, fast mode.
export const MANUAL_ROWS = 2;
export const MAX_ROWS = 200;

const SCAN_SPEED = 30;     // cells per second over 000 triples
const FINISH_SPEED = 80;   // cells per second when completing a row
export const WELD_RISE = 0.35;    // seconds: the new row moves up to the triangle
export const WELD_SHIFT = 0.25;   // seconds: everything moves up one row

export function evolve(row) {
    const k = (row.length - 1) / 2;
    const next = new Uint8Array(row.length + 2);
    const at = x => (x >= -k && x <= k ? row[x + k] : 0);
    for (let x = -k - 1; x <= k + 1; x++)
        next[x + k + 1] = RULE[4 * at(x - 1) + 2 * at(x) + at(x + 1)];
    return next;
}

export class Rule30Model {
    constructor() {
        this.rows = [Uint8Array.of(1)];
        this.reset();
    }

    reset() {
        this.goToRowStart(0);
    }

    row(k) {
        while (this.rows.length <= k) this.rows.push(evolve(this.rows[this.rows.length - 1]));
        return this.rows[k];
    }

    cell(k, x) {
        return Math.abs(x) <= k ? this.row(k)[x + k] : 0;
    }

    // The triple under the window at cursor c, as a number 0..7.
    triple(c, k = this.m) {
        return 4 * this.cell(k, c - 1) + 2 * this.cell(k, c) + this.cell(k, c + 1);
    }

    firstInteresting(k) {
        let c = X0;
        while (c < X1 && this.triple(c, k) === 0) c++;
        return c;
    }

    // Where "back" lands: the state in which the construction of row k + 1
    // starts. For row 1 that is before the first Space; for the others it is
    // where the automatic scan stops.
    goToRowStart(k) {
        this.m = k;
        this.acc = 0;
        this.weldT = 0;
        if (k === 0) { this.mode = 'ready'; this.c = X0 - 1; }
        else { this.mode = 'manual'; this.c = this.firstInteresting(k); }
    }

    atRowStart() {
        if (this.m === 0) return this.mode === 'ready';
        return this.mode === 'manual' && this.c === this.firstInteresting(this.m);
    }

    get windowVisible() {
        return (this.mode === 'scan' || this.mode === 'manual' || this.mode === 'finish') && this.c >= X0;
    }

    space() {
        switch (this.mode) {
            case 'ready': this.mode = 'scan'; this.acc = 1; break;
            case 'manual':
                if (this.c < X1) this.c++;
                else this.startWeld();
                break;
            case 'fast': this.addRow(); break;
        }
    }

    forward() {
        switch (this.mode) {
            case 'ready': case 'scan': case 'manual': this.mode = 'finish'; this.acc = 0; break;
            case 'fast': this.addRow(); break;
        }
    }

    back() {
        if (this.mode === 'fast') {
            if (this.m > MANUAL_ROWS) this.m--;
            else this.goToRowStart(MANUAL_ROWS - 1);
        } else if (!this.atRowStart()) {
            this.goToRowStart(this.m);
        } else if (this.m > 0) {
            this.goToRowStart(this.m - 1);
        }
    }

    addRow() {
        if (this.m < MAX_ROWS) this.m++;
    }

    startWeld() {
        this.mode = 'weld';
        this.weldT = 0;
    }

    update(dt) {
        if (this.mode === 'scan') {
            this.acc += dt * SCAN_SPEED;
            while (this.acc >= 1 && this.mode === 'scan') {
                this.acc -= 1;
                this.c++;
                if (this.c >= X1 || this.triple(this.c) !== 0) this.mode = 'manual';
            }
        } else if (this.mode === 'finish') {
            this.acc += dt * FINISH_SPEED;
            while (this.acc >= 1 && this.c < X1) { this.acc -= 1; this.c++; }
            if (this.c >= X1) this.startWeld();
        } else if (this.mode === 'weld') {
            this.weldT += dt;
            if (this.weldT >= WELD_RISE + WELD_SHIFT) {
                this.m++;
                if (this.m >= MANUAL_ROWS) this.mode = 'fast';
                else { this.mode = 'scan'; this.c = X0 - 1; this.acc = 0; }
                this.weldT = 0;
            }
        }
    }
}
