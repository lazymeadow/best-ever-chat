import $ from 'jquery';

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
                .click(this.selectColor)
                .attr('value', colors[color])
            );
        }
    }

    setColor(color) {
        if ($.inArray(color, colors)) {
            let selected = this.element.children('[value="' + color + '"]');
            selected.click();
        }
    };

    selectColor(event) {
        $('.selected-color').removeClass('selected-color');
        $(event.target).addClass('selected-color');
        this.element.val($(event.target).attr('value'));
    };

    getColor() {
        return this.element.val();
    }
}
