// The order of the talk. See SLIDES.md for what each slide is meant to show.
// Slides not implemented yet are missing from the list, not stubbed.

import {ImageSlide} from './image-slide.js';
import {TitleSlide} from './title.js';
import {Rule30Slide} from './rule30.js';
import {GolRuleSlide} from './golrule.js';
import {BZSlide, BZFusionSlide} from './bz.js';
import {P416Slide, LifeInLifeSlide, TickerSlide} from './hashlife-slides.js';
import {PortaAndSlide} from './porta-and.js';

export const slides = [
    new TitleSlide(),
    new BZSlide(),
    new ImageSlide('bz-foto', [
        {src: 'bz.png', caption: 'Reazione di Belousov-Zhabotinsky'},
    ]),
    // A variant of the two slides above, for GMT to judge (SLIDES.md, bz-sim).
    new BZFusionSlide(),
    new Rule30Slide(),
    new ImageSlide('conchiglie', [
        {src: 'shell.png', caption: 'Conus textile'},
        {src: 'shell2.png', caption: 'Marco Schutzmann'},
    ]),
    new ImageSlide('regel30', [
        {src: 'regel30.png', caption: 'Regel 30, Kristoffer Myskja'},
        {src: 'wolfrule30.png'},
    ]),
    new ImageSlide('life-arte', [
        {src: 'gameofspace.png', caption: 'Game of Space, Hiroshima MOCA'},
        {src: 'gol_hw.png'},
        {src: 'cloth1.jpg'},
        {src: 'russell.jpg', caption: 'Game of Life by Rose Lewenstein at The Yard, 2012'},
    ]),
    new ImageSlide('conway', [
        {src: 'Conway_1k.jpg', caption: 'John Horton Conway (1937–2020)'},
        {src: 'conway_tongue.png'},
    ]),
    new GolRuleSlide(),
    new ImageSlide('glider', [
        {src: 'tshirt.png'},
        {src: 'engraved_glider.jpg'},
    ]),
    new PortaAndSlide(),
    new ImageSlide('macchine', [
        {src: 'rise_of_machines.png'},
        {src: 'rise_of_machines2.jpg'},
        {src: 'gollys.png', caption: 'Golly'},
    ]),
    new P416Slide(),
    new LifeInLifeSlide(),
    new TickerSlide(),
];
