/**
 * BEST EVAR CHAT 3.0.0 MOBILE CLIENT
 * @author Audrey Mavra McCormick
 */

import $ from 'jquery';
import Cookies from 'js-cookie';
import {_parseEmojis} from "./lib";

if (!Cookies.get('id')) {
    location.reload();
}

$(() => {
    const overlay = $('.overlay');
    overlay.hide();

    // dismiss popout menus when clicking away from them
    $('body').click(() => {
        $('.popout-option').hide();
    });

    // overlay dismisses on click
    overlay.click(() => {
        const popoutMenu = $('.popout-menu');
        popoutMenu.animate({right: '-80%'}, {
            duration: 500,
            done: () => {
                popoutMenu.hide();
                overlay.hide();
            }
        });
    });

    // open main menu on click
    $('#main_menu').click(event => {
        event.stopPropagation();
        overlay.show();
        $('.popout-menu').show().animate({right: '0'}, {duration: 500});
    });

    const chatBar = $('.chat-bar');

    // add popout handlers on click for image chat and emoji list
    chatBar.children('.button').each((index, element) => {
        const popoutOption = $(element).children('.popout-option');

        // prevent clicking the child from toggling itself
        popoutOption.click(event => event.stopPropagation());

        $(element).click(event => {
            event.stopPropagation();
            if (popoutOption.is(':visible')) {
                popoutOption.hide();
            } else {
                // hide all popouts
                $('.popout-option').hide();
                // toggle the child
                popoutOption.show();
            }
        });
    });


    // parse emoji list and button
    _parseEmojis();
});