/**
 * BEST EVAR CHAT 3.0.0 WEB CLIENT
 * @author Audrey Mavra McCormick
 */

import $ from 'jquery';
import Cookies from 'js-cookie';
import {DesktopClient} from "./client";
import {preClientInit, postClientInit} from "./lib";


if (!Cookies.get('id')) {
    location.reload();
}

$(() => {
    const overlay = $('.overlay');

    // overlay dismisses and hides menu on click
    overlay.click(() => {
        overlay.hide();
        $('.popout-menu').hide();
    });

    // open main menu on click and show overlay
    $('#main_menu').click(event => {
        event.stopPropagation();
        overlay.show();
        $('.popout-menu').toggle();
    });

    preClientInit();
    postClientInit(new DesktopClient());
});
