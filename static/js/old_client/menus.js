/*
options: {
    toggleHandler: function,
    menuId: string,
    menuItems: [
        {
            iconClass: str,
            name: str,
            callback: function,
            id: str,
            disabled: boolean
        }
    ]
}
 */

function menu(parentElement, options) {
    parentElement.click(function () {
        if (options.toggleHandler)
            options.toggleHandler();
        toggleMenu(options.menuId);
    })
        .parent().append($('<div>').prop('id', options.menuId)
            .addClass('menu')
            .append(function () {
                var menuItems = [];
                $.each(options.menuItems, function (_, menuItem) {
                    menuItems.push($('<span>').addClass('menu-item')
                        .prop('id', menuItem.id)
                        .append($('<span>').addClass(menuItem.iconClass))
                        .append('\n' + menuItem.name)
                        .click(function (event) {
                            if (!$(event.target).hasClass('disabled')) {
                                menuItem.callback(event);
                            }
                        })
                        .addClass(menuItem.disabled ? 'disabled' : ''));
                });
                return menuItems;
            })
            .hide());
    return parentElement;
}

function toggleMenu(whichOne) {
    var menu = $('#' + whichOne);
    if (menu.is(':visible'))
        menu.hide();
    else
        menu.show();
    $('.menu:not(#' + whichOne + ')').hide();
}
