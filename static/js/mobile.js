/**
 * BEST EVAR CHAT 3.0.0 MOBILE CLIENT
 * @author Audrey Mavra McCormick
 */

import $ from 'jquery';
import Cookies from 'js-cookie';
import {MobileClient} from "./client";
import {preClientInit, postClientInit} from "./lib";

if (!Cookies.get('id')) {
    location.reload();
}

$(() => {
    const overlay = $('.overlay');

    const hideMenu = () => {
        const popoutMenu = $('#main_menu + .popout-menu');
        popoutMenu.animate({right: '-80%'}, {
            duration: 500,
            done: () => {
                popoutMenu.hide();
                overlay.hide();
            }
        });
    };

    // overlay dismisses on click and slides menu out
    overlay.click(hideMenu);


    $('#main_menu + .popout-menu').children().click(hideMenu);

    // slide in main menu on click and show overlay
    $('#main_menu').click(event => {
        event.stopPropagation();
        overlay.show();
        $('#main_menu + .popout-menu').show().animate({right: '0'}, {duration: 500});
    });

    preClientInit();
    postClientInit(new MobileClient());
});
