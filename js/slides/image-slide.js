// A slide made of images, one per act, cross-fading into each other.
// items: [{src, caption?}], src relative to assets/images/.

import {Slide} from '../core/stage.js';

export class ImageSlide extends Slide {
    constructor(name, items) {
        super(name, items.length);
        this.items = items;
    }

    start() {
        this.steps = this.items.map(item => {
            const div = document.createElement('div');
            div.className = 'image-step';
            const img = document.createElement('img');
            img.src = 'assets/images/' + item.src;
            img.draggable = false;
            div.appendChild(img);
            if (item.caption) {
                const cap = document.createElement('div');
                cap.className = 'caption';
                cap.textContent = item.caption;
                div.appendChild(cap);
            }
            this.layer.appendChild(div);
            return div;
        });
    }

    enterAct(n) {
        this.steps.forEach((div, i) => div.classList.toggle('visible', i === n));
    }
}
