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
                        return "Nobody is a moderator.";
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
            },
            {
                key: 'grant admin',
                name: 'Grant administrator',
                getContent: response => {
                    if (response.data.length === 0) {
                        return "Everyone's already an admin.";
                    }
                    return $('<div>').addClass('form-element')
                        .append($('<label>', {text: 'Choose a new admin', for: 'new_admin'}))
                        .append($('<select>', {id: 'new_admin'})
                            .append(response.data.map(element => $('<option>', {
                                value: element.id,
                                text: `${element.id} (${element.username})`
                            }))))
                        .append($('<button>', {text: 'Grant admin'}).click(() => {
                            this._chatClient.sendAdminRequest(response.request, {parasite: $('#new_admin').val()});
                        }));
                }
            },
            {
                key: 'revoke admin',
                name: 'Revoke administrator',
                getContent: response => {
                    if (response.data.length === 0) {
                        return "Nobody is an admin.";
                    }
                    return $('<div>').addClass('form-element')
                        .append($('<label>', {text: 'Choose an admin to remove', for: 'no_admin'}))
                        .append($('<select>', {id: 'no_admin'})
                            .append(response.data.map(element => $('<option>', {
                                value: element.id,
                                text: `${element.id} (${element.username})`
                            }))))
                        .append($('<button>', {text: 'Revoke admin'}).click(() => {
                            this._chatClient.sendAdminRequest(response.request, {parasite: $('#no_admin').val()});
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