function bestColorPicker(element) {
    var colorpickerElement = $(element);
    var colors = [
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

    colorpickerElement.setColor = function (color) {
        if ($.inArray(color, colors)) {
            var selected = colorpickerElement.children('[value="' + color + '"]');
            selected.click();
        }
    };

    colorpickerElement.selectColor = function (event) {
        $('.selected-color').removeClass('selected-color');
        $(event.target).addClass('selected-color');
        colorpickerElement.val($(event.target).attr('value'));
    };

    colorpickerElement.addClass('colorpicker');

    for (var i=0; i < colors.length; i++) {
        var colorBlock = $('<span/>').addClass('color-block').css('background-color', colors[i]).click(colorpickerElement.selectColor).attr('value', colors[i]);
        colorpickerElement.append(colorBlock);
    }

    return colorpickerElement;
}

