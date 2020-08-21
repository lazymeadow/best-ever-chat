import $ from "jquery";
import ToolsBase from "./ToolsBase";

let _instance;

export class AdminTools extends ToolsBase {
    constructor(chatClient) {
        super(chatClient);

        this.availableTools = [
            {
                key: 'grant mod',
                name: 'Grant moderator',
                getContent: response => {
                    if (response.data.length === 0) {
                        return "Everyone's already a moderator.";
                    }
                    return $('<div>').addClass('form-element')
                        .append($('<label>', {text: 'Choose a new moderator', for: 'new_mod'}))
                        .append($('<select>', {id: 'new_mod'})
                            .append(response.data.map(element => $('<option>', {
                                value: element.id,
                                text: `${element.id} (${element.username})`
                            }))))
                        .append($('<button>', {text: 'Grant moderator'}).click(() => {
                            this._chatClient.sendAdminRequest(response.request, {parasite: $('#new_mod').val()});
                        }));
                }
            },
            {
                key: 'revoke mod',
                name: 'Revoke moderator',
                getContent: response => {
                    if (response.data.length === 0) {
                        return "Everyone's already a moderator.";
                    }
                    return $('<div>').addClass('form-element')
                        .append($('<label>', {text: 'Choose a moderator to remove', for: 'no_mod'}))
                        .append($('<select>', {id: 'no_mod'})
                            .append(response.data.map(element => $('<option>', {
                                value: element.id,
                                text: `${element.id} (${element.username})`
                            }))))
                        .append($('<button>', {text: 'Revoke moderator'}).click(() => {
                            this._chatClient.sendAdminRequest(response.request, {parasite: $('#no_mod').val()});
                        }));
                }
            }
        ];
    }

    static instance(chatClient) {
        if (!_instance) {
            _instance = new AdminTools(chatClient);
        }
        return _instance;
    }
}