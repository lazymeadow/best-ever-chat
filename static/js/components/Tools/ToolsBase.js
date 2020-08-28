import $ from "jquery";
import {LoggingClass} from "../../util";

export default class ToolsBase extends LoggingClass {
    constructor(chatClient) {
        super();
        this._chatClient = chatClient;
        this.availableTools = [];
        this._toolsElement = $('<div>');
        this._toolsElement.text('Loading...');
        this._toolContent = $('<div>', {id: 'tools_content'});
        this._toolsSelect = $('<select>', {id: 'admin_tool'});
        this.modalId = 'tools_modal';
    }

    getToolsContent() {
        return this._toolsElement;
    }

    /**
     * Creates the dropdown listing tools for selection
     */
    setTools(availableTools) {
        this._toolsElement.empty();
        this._toolsSelect.empty();
        this._toolsSelect
            .append(availableTools.map(
                toolData => $('<option>', {value: toolData.key, text: toolData.name})
            ));

        this._toolsSelect.val(null);

        this._toolsElement
            .append($('<div>').addClass('form-group tools')
                .append($('<div>').addClass('form-element')
                    .append($('<label>', {text: 'Pick One', for: 'admin_tool'}))
                    .append(this._toolsSelect)))
            .append($('<hr/>'))
            .append(this._toolContent).addClass('form-group');

        this._toolsSelect.change(() => {
            const selected = this._toolsSelect.val();
            if (selected) {
                this.debug(`Requesting tool data (${selected})`);
                this._toolContent.html(this._getToolData(selected));
            }
        });

    }

    _emptyModalMessage() {
        $(`#${this.modalId} .message`).empty();
    }

    _setModalMessage(message) {
        $(`#${this.modalId} .message`).text(message);
    }

    _buildGrantTool(toolDataSelect, data, toolInfo, request) {
        this._toolContent.append($('<div>').addClass('form-group tools')
            .append($('<div>').addClass('form-element')
                .append($('<label>', {text: toolInfo['tool text'], for: 'tool_select'}))
                .append(toolDataSelect
                    .append(data.map(element => $('<option>', {
                        value: element.id,
                        text: `${element.id} (${element.username})`
                    }))))))
            .append(this._buildRunToolButton(request, () => ({parasite: $('#tool_select').val()})));
        toolDataSelect.val(null);
    }

    _buildRoomTool(toolDataSelect, data, toolInfo, request) {
        this._toolContent.append($('<div>').addClass('form-element')
            .append($('<label>', {text: toolInfo['tool text'], for: 'tool_select'}))
            .append(toolDataSelect
                .append(data.map(element => $('<option>', {
                    value: element.id,
                    text: `${element.name} (${element.id})`
                })))))
            .append(this._buildRunToolButton(request, () => ({room: parseInt($('#tool_select').val())})));
        toolDataSelect.val(null);
    }

    _buildRoomOwnerTool(toolDataSelect, data, toolInfo, request) {
        function handle_room_choice() {
            const members = $(this[this.options.selectedIndex]).data('members');
            $('#tool_select2').attr('disabled', false).html(members.map(element => $('<option>', {
                value: element,
                text: element
            })));
        }

        this._toolContent.append($('<div>').addClass('form-element')
            .append($('<label>', {text: toolInfo['tool text'], for: 'tool_select'}))
            .append(toolDataSelect
                .append(data.map(element => $('<option>', {
                    value: element.id,
                    text: `${element.name} (${element.id})`
                }).data('members', element.members)))
                .change(handle_room_choice)))
            .append($('<div>').addClass('form-element')
                .append($('<label>', {text: toolInfo['tool text 2'], for: 'tool_select2'}))
                .append($('<select>', {id: 'tool_select2', value: null, disabled: true})))
            .append(this._buildRunToolButton(request, () => ({room: parseInt($('#tool_select').val()), parasite: $('#tool_select2').val()})));
        toolDataSelect.val(null);
    }

    _buildRunToolButton(request, dataFn) {
       return $('<button>', {text: 'Just do it'}).click(() => {
                    this.debug(`Executing tool (${request})`);
                    this._chatClient.sendAdminRequest(request, dataFn());
                });
    }

    populateTool(response) {
        this._toolContent.empty();
        this._emptyModalMessage();
        this._toolsSelect.prop('disabled', false);
        if (response.error || response.request !== this._toolsSelect.val()) {
            this._toolContent.html("Request failed: " + response.error);
        } else {
            const {'tool info': toolInfo, data} = response;
            this._toolContent.html($('<p>').text(toolInfo['tool description']));
            if (data.length === 0) {
                this._toolContent.append($('<p>').text(toolInfo['no data']));
            } else {
                const toolDataSelect = $('<select>', {id: 'tool_select'});

                switch (toolInfo['tool type']) {
                    case 'grant':
                        this._buildGrantTool(toolDataSelect, data, toolInfo, response.request);
                        break;
                    case 'room':
                        this._buildRoomTool(toolDataSelect, data, toolInfo, response.request);
                        break;
                    case 'room owner':
                        this._buildRoomOwnerTool(toolDataSelect, data, toolInfo, response.request);
                        break;
                    case 'parasite':
                    default:
                        this._toolContent.text('nope');
                }
            }
        }
    }

    toolConfirm(message) {
        this._setModalMessage(message);
    }

    _getToolData(tool) {
        this._emptyModalMessage();
        this._chatClient.requestData(tool);
        this._toolsSelect.prop('disabled', true);
        return 'Loading...';
    }

    resetTools() {
        this._toolsElement.text('Loading...');
        this._toolContent.empty();
        this._emptyModalMessage();
        this._toolsSelect.val(null);
    }
}
