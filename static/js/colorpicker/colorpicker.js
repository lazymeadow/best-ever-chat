function bestColorPicker(element) {
    var colorpickerElement = $(element);
    var colors = [
        '#555555',
        '#ff5555',
        '#ee7733',
        '#44cc44',
        '#5555ff',
        '#aa77cc',
        '#ffabbc',
        '#775634',
        '#991111',
        '#aa3300',
        '#118822',
        '#111188',
        '#663388'
    ];

    var value = colors[0];

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

    for (var color in colors) {
        var colorBlock = $('<span/>').addClass('color-block').css('background-color', colors[color]).click(colorpickerElement.selectColor).attr('value', colors[color]);
        colorpickerElement.append(colorBlock);
    }

    return colorpickerElement;
}

