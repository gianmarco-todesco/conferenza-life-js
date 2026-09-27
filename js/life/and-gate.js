// The AND gate of the 'porta-and' slide, in world coordinates (y down).
// Found and verified with tools/and-search.mjs and tools/and-verify.mjs:
// change a number here and run the verification again.
//
// Two Gosper guns off-screen at the top left fire the streams A and B down
// to the right; one at the top right fires T down to the left. T meets B
// first: if B is on, both vanish and A goes on to the receiver. If B is off,
// T goes on and annihilates A. So the receiver gets gliders iff A and B.
// A stream is switched off by an eater placed in front of its gun.

export const LAYOUT = {
    gunA: {x: -143, y: -77, flipX: false},
    gunB: {x: -63, y: -77, flipX: false},
    gunT: {x: 64, y: -75, flipX: true},
    // Switches: present = stream off.
    switchA: {x: -115, y: -63, flipX: false, flipY: false},
    switchB: {x: -35, y: -63, flipX: false, flipY: false},
    // The receiver at the end of A, and the eater at the end of T.
    receiver: {x: -9, y: 43, flipX: false, flipY: false},
    endT: {x: -62, y: 69, flipX: true, flipY: false},
    // Where the stream crossings are.
    crossBT: {x: 19, y: -8.5},
    crossAT: {x: -21, y: 31.5},
    // Sensors: 5x5 boxes on the lanes, centered here. A glider crosses one in
    // a few generations; a channel is active if its sensor saw one recently.
    sensors: {
        A: {x: -52, y: 0},      // A before it meets T
        B: {x: -2, y: -30},     // B before it meets T
        T0: {x: 60, y: -50},    // T as it comes in (always on)
        T: {x: -1, y: 12},      // T between B and A: only if B did not stop it
        out: {x: -14, y: 37},   // A after T: what reaches the receiver
    },
    SENSOR_RADIUS: 2,
    // Lanes: down-right streams run along x - y = c, down-left ones along
    // x + y = c (measured on a lone gun: c = x - y + 13.5 of the gun, and
    // x + y + 21.5 of the flipped one).
    laneA: -52.5,
    laneB: 27.5,
    laneT: 10.5,
};

// Is there a live cell in the sensor box? life.get(x, y) in world coordinates.
export function sensorHit(life, s) {
    const r = LAYOUT.SENSOR_RADIUS;
    for (let y = s.y - r; y <= s.y + r; y++)
        for (let x = s.x - r; x <= s.x + r; x++) if (life.get(x, y)) return true;
    return false;
}

// The eater used for every switch, receiver and end (fishhook).
export const EATER = {w: 4, h: 4, cells: [[0, 0], [1, 0], [0, 1], [2, 1], [2, 2], [2, 3], [3, 3]]};

export function eaterCells(e) {
    return EATER.cells.map(([x, y]) => [e.x + (e.flipX ? EATER.w - 1 - x : x), e.y + (e.flipY ? EATER.h - 1 - y : y)]);
}

// When a switch may change, as a phase of the guns (generation mod 30, with
// the guns placed at generation 0). Found by tools/and-phases.mjs, which
// compares cell by cell with a gate built in the new state: removing the
// eater is clean at any phase, placing it only at one. The stream is so
// dense that there is always a glider close to the eater, and at most phases
// placing it would cut one in two.
export const PERIOD = 30;
export const PLACE_PHASES = [16];

export function switchReady(generation, on) {
    return on || PLACE_PHASES.includes(generation % PERIOD);
}
