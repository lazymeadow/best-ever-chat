import $ from 'jquery';

$(function () {
    const last_login = localStorage.getItem('last_login');
    if (last_login) {
        $('#parasite').val(last_login);
        $('#remember').prop('checked', true);
    }

    $('#register').click(function () {
        window.location = '/register';
    });

    $('form').submit(function () {
        if ($('#remember').is(':checked')) {
            localStorage.setItem('last_login', $('#parasite').val());
        }
        else {
            localStorage.removeItem('last_login');
        }
    });
});
