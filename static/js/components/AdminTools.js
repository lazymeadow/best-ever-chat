import $ from "jquery";

export default class AdminTools {
    static getTools(chatClient) {
        const toolsSelect = $('<select>', {id: 'admin_tool'})
            .append($('<option>', {
                value: '',
                text: 'Select a tool'
            }))
            .append($('<option>', {
                value: 'grant mod',
                text: 'Grant moderator'
            }))
            .append($('<option>', {
                value: 'revoke mod',
                text: 'Revoke moderator'
            }))
            .append($('<option>', {
                value: 'deactivate parasite',
                text: 'De-activate parasite'
            }))
            .append($('<option>', {
                value: 'reactivate parasite',
                text: 'Re-activate parasite'
            }));

        const toolsElement = $('<div>')
            .append($('<div>').addClass('form-group')
                .append($('<div>').addClass('form-element')
                    .append($('<label>', {text: 'Pick One', for: 'admin_tool'}))
                    .append(toolsSelect)))
            .append($('<hr/>'))
            .append($('<div>', {id: 'tools_content'}).addClass('form-group'));
        toolsSelect.change(() => {
            $('#tools_content').html(AdminTools._getTool(toolsSelect.val(), chatClient));
        });

        return toolsElement;
    }

    static populateTool(response, chatClient) {
        $('#admin_tool').prop('disabled', false);
        $('#tools_content').empty();
        if (response.error || response.request !== $('#admin_tool').val()) {
            $('#tools_content').html("Request failed: " + response.error);
        }
        else {
            switch (response.request) {
                case 'grant mod':
                    $('#tools_content')
                        .append($('<div>').addClass('form-element')
                            .append($('<label>', {text: 'Choose a new moderator', for: 'new_mod'}))
                            .append($('<select>', {id: 'new_mod'})
                                .append(response.data.map(element => $('<option>', {
                                    value: element.id,
                                    text: `${element.id} (${element.username})`
                                }))))
                            .append($('<button>', {text: 'Grant moderator'}).click(() => {
                                chatClient.sendAdminRequest(response.request, {parasite: $('#new_mod').val()});
                            })));
                    break;
                case 'revoke mod':
                    $('#tools_content')
                        .append($('<div>').addClass('form-element')
                            .append($('<label>', {text: 'Choose a moderator to remove', for: 'no_mod'}))
                            .append($('<select>', {id: 'no_mod'})
                                .append(response.data.map(element => $('<option>', {
                                    value: element.id,
                                    text: `${element.id} (${element.username})`
                                }))))
                            .append($('<button>', {text: 'Revoke moderator'}).click(() => {
                                chatClient.sendAdminRequest(response.request, {parasite: $('#no_mod').val()});
                            })));
            }
        }
    }

    static _getTool(tool, chatClient) {
        switch (tool) {
            case ('grant mod'):
                chatClient.requestData(tool);
                $('#admin_tool').prop('disabled', true);
                return 'Loading...';
            case ('revoke mod'):
                chatClient.requestData(tool);
                $('#admin_tool').prop('disabled', true);
                return 'Loading...';
            case ('deactivate parasite'):
                return $('<div>').text('Load up the form bitch');
            case ('reactivate parasite'):
                return $('<div>').text('Load up the other form bitch');
            default:
                return "Yeah whatever";
        }
    }
}