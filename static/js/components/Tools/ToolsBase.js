import $ from "jquery";

export default class ToolsBase {
    constructor(chatClient) {
        this._chatClient = chatClient;
        this.availableTools = [];
        this._toolsElement = $('<div>');
        this._toolsElement.text('loading');
        this._toolContent = $('<div>', {id: 'tools_content'});
        this._toolConfirmation = $('<pre>', {id: 'tools_confirm'});
    }

    getToolsContent() {
        return this._toolsElement;
    }

    /**
     * Creates the dropdown listing tools for selection
     */
    setTools({data: availableTools}) {
        this._toolsElement.empty();
        const toolsSelect = $('<select>', {id: 'admin_tool'})
            .append($('<option>', {text: 'Select your tool'}))
            .append(availableTools.map(
                toolData => $('<option>', {value: toolData.key, text: toolData.name})
            ));

        this._toolsElement
            .append($('<div>').addClass('form-group')
                .append($('<div>').addClass('form-element')
                    .append($('<label>', {text: 'Pick One', for: 'admin_tool'}))
                    .append(toolsSelect)))
            .append($('<hr/>'))
            .append(this._toolContent).addClass('form-group')
            .append(this._toolConfirmation);

        toolsSelect.change(() => {
            $('#tools_content').html(this._getToolData(toolsSelect.val()));
        });
    }

    populateTool(response) {
        this._toolContent.empty();
        this._toolConfirmation.empty();
        $('#admin_tool').prop('disabled', false);
        if (response.error || response.request !== $('#admin_tool').val()) {
            this._toolContent.html("Request failed: " + response.error);
        }
        else {
            const {'tool info': toolInfo, data} = response;
            if (data.length === 0) {
                this._toolContent.text(toolInfo['no data']);
            }
            else if (toolInfo['tool type'] === 'grant') {
                this._toolContent.html($('<div>').addClass('form-element')
                    .append($('<label>', {text: toolInfo['tool text'], for: 'tool_select'}))
                    .append($('<select>', {id: 'tool_select'})
                        .append(data.map(element => $('<option>', {
                            value: element.id,
                            text: `${element.id} (${element.username})`
                        }))))
                    .append($('<button>', {text: 'Just do it'}).click(() => {
                        this._chatClient.sendAdminRequest(response.request, {parasite: $('#tool_select').val()});
                    })));
            }
        }
    }

    toolConfirm(message) {
        this._toolConfirmation.text(message);
    }

    _getToolData(tool) {
        this._toolConfirmation.empty();
        this._chatClient.requestData(tool);
        $('#admin_tool').prop('disabled', true);
        return 'Loading...';
    }

    resetTools() {
        this._toolContent.empty();
        this._toolConfirmation.empty();
    }
}
