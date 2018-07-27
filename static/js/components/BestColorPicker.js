import $ from 'jquery';
import {Settings} from "../util";

const colors = [
    '#555555',
    '#ff5555',
    '#ee7733',
    '#0fba0f',
    '#10b1c9',
    '#5555ff',
    '#bc84e0',
    '#f27e95',
    '#775634',
    '#991111',
    '#aa3300',
    '#118822',
    '#186f7d',
    '#18187d',
    '#663388',
    '#b51ba6'
];

export class BestColorPicker {
    constructor(element) {
        this.element = element.empty();

        this.element.addClass('colorpicker');

        for (let color in colors) {
            this.element.append($('<span/>').addClass('color-block')
                .css('background-color', colors[color])
                .click(() => {
                    this.color = colors[color];
                })
                .attr('value', colors[color])
            );
        }

        this.color = Settings.color || colors[0];
    }

    set color(color) {
        if ($.inArray(color, colors) >= 0) {
            $('.selected-color').removeClass('selected-color');
            this.element.children('[value="' + color + '"]').addClass('selected-color');
            this.element.val(color);
        }
    }

    get color() {
        return this.element.val();
    }
}
