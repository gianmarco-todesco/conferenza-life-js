// The stage: a fixed 1920x1080 area scaled to the window, the list of slides,
// navigation between slides and between the steps ("acts") inside a slide,
// the URL hash, input routing and the animation loop.
//
// Keyboard conventions (SLIDES.md, "Convenzioni comuni"):
//   PageDown/PageUp, ArrowDown/ArrowUp   next/previous slide
//   ArrowRight/ArrowLeft                 next/previous act of the slide
//   0                                    first act of the slide
//   f                                    fullscreen
// Every other key is offered to the current slide.

export const STAGE_W = 1920;
export const STAGE_H = 1080;

// Canvas backing stores are never allowed to grow beyond this multiple of the
// stage size: a 4K screen at 150% would otherwise ask for 3x buffers.
const MAX_PIXEL_RATIO = 2;

let stageEl = null;
let scale = 1;
const slides = [];
let current = null;
let currentIndex = -1;

export class Slide {
    constructor(name, actCount = 1) {
        this.name = name;
        this.actCount = actCount;
        this.act = 0;
        this.layer = null;
        this._canvases = [];
    }

    // Hooks. The layer exists from start() to stop().
    start() {}
    stop() {}
    // Must bring the slide to act n from any state, including a later act:
    // going back and reloading the page on '#name/n' both rely on it.
    enterAct(n, previous) {}
    // Returns true if the key was used.
    onKey(e) { return false; }
    onPointerDown(p, e) {}
    onPointerMove(p, e) {}
    onPointerUp(p, e) {}
    onWheel(p, e) {}
    // Called once per animation frame while the slide is shown.
    update(dt, t) {}
    // Called after the stage scale changed and the canvases were resized.
    resize() {}

    // A canvas covering the stage (or the given rectangle, in stage pixels)
    // whose context draws in stage pixels, with a backing store at the real
    // screen resolution: a canvas scaled up by CSS would be resampled and blur.
    createCanvas(x = 0, y = 0, w = STAGE_W, h = STAGE_H) {
        const canvas = document.createElement('canvas');
        canvas.style.left = x + 'px';
        canvas.style.top = y + 'px';
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        this.layer.appendChild(canvas);
        const sc = new StageCanvas(canvas, w, h);
        this._canvases.push(sc);
        return sc;
    }
}

export class StageCanvas {
    constructor(canvas, w, h) {
        this.canvas = canvas;
        this.width = w;
        this.height = h;
        this.ctx = canvas.getContext('2d');
        this.fit();
    }

    fit() {
        const ratio = pixelRatio();
        this.ratio = ratio;
        this.canvas.width = Math.round(this.width * ratio);
        this.canvas.height = Math.round(this.height * ratio);
        this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
}

export function pixelRatio() {
    return Math.min(scale * (window.devicePixelRatio || 1), MAX_PIXEL_RATIO);
}

export function registerSlides(list) {
    slides.push(...list);
}

export function currentSlide() {
    return current;
}

function fitStage() {
    scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
    stageEl.style.transform = `scale(${scale}) translate(-50%, -50%)`;
    if (current) {
        current._canvases.forEach(c => c.fit());
        current.resize();
    }
}

function showSlide(index, act = 0) {
    if (index < 0 || index >= slides.length) return;
    if (current) {
        current.stop();
        current.layer.remove();
        current.layer = null;
        current._canvases = [];
    }
    currentIndex = index;
    current = slides[index];
    current.layer = document.createElement('div');
    current.layer.className = 'slide-layer';
    stageEl.appendChild(current.layer);
    current.act = 0;
    current.start();
    current.enterAct(0, -1);
    if (act > 0) setAct(act);
    writeHash();
}

function setAct(n) {
    if (!current) return;
    n = Math.max(0, Math.min(current.actCount - 1, n));
    if (n === current.act) return;
    const previous = current.act;
    current.act = n;
    current.enterAct(n, previous);
    writeHash();
}

// The hash is '#name' or '#name/act'. replaceState, not assignment: every act
// would otherwise become a history entry, and assigning fires hashchange.
function writeHash() {
    const h = '#' + current.name + (current.act > 0 ? '/' + current.act : '');
    if (window.location.hash !== h) history.replaceState(null, '', h);
}

function readHash() {
    const m = /^#([\w-]+)(?:\/(\d+))?$/.exec(window.location.hash);
    if (!m) return null;
    const index = slides.findIndex(s => s.name === m[1]);
    if (index < 0) return null;
    return {index, act: m[2] ? parseInt(m[2], 10) : 0};
}

function stagePoint(e) {
    const r = stageEl.getBoundingClientRect();
    return {x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale};
}

function onKeyDown(e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    let used = true;
    switch (e.key) {
        case 'PageDown':
        case 'ArrowDown': showSlide(currentIndex + 1); break;
        case 'PageUp':
        case 'ArrowUp': showSlide(currentIndex - 1); break;
        case 'ArrowRight': setAct(current.act + 1); break;
        case 'ArrowLeft': setAct(current.act - 1); break;
        // Also when already on act 0: '0' is how a slide is restarted.
        case '0': if (current.act === 0) current.enterAct(0, 0); else setAct(0); break;
        case 'f':
        case 'F': toggleFullscreen(); break;
        default: used = current ? current.onKey(e) === true : false;
    }
    if (used) e.preventDefault();
}

function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
}

function installInput() {
    window.addEventListener('keydown', onKeyDown);
    stageEl.addEventListener('pointerdown', e => {
        stageEl.setPointerCapture(e.pointerId);
        if (current) current.onPointerDown(stagePoint(e), e);
    });
    stageEl.addEventListener('pointermove', e => {
        if (current) current.onPointerMove(stagePoint(e), e);
    });
    stageEl.addEventListener('pointerup', e => {
        if (current) current.onPointerUp(stagePoint(e), e);
    });
    stageEl.addEventListener('wheel', e => {
        e.preventDefault();
        if (current) current.onWheel(stagePoint(e), e);
    }, {passive: false});
    stageEl.addEventListener('contextmenu', e => e.preventDefault());
}

function startLoop() {
    let last = performance.now();
    function frame(t) {
        // Clamped so that a slide coming back from a hidden tab does not jump.
        const dt = Math.min((t - last) / 1000, 0.1);
        last = t;
        if (current) current.update(dt, t / 1000);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

export function run() {
    stageEl = document.getElementById('stage');
    fitStage();
    window.addEventListener('resize', fitStage);
    installInput();
    window.addEventListener('hashchange', () => {
        const h = readHash();
        if (h && (h.index !== currentIndex || h.act !== current.act)) showSlide(h.index, h.act);
    });
    const h = readHash();
    showSlide(h ? h.index : 0, h ? h.act : 0);
    startLoop();
}
