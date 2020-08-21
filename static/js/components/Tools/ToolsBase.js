import $ from "jquery";

export default class ToolsBase {
    constructor(chatClient) {
        this._chatClient = chatClient;
        this.availableTools = [];
    }

    /**
     * Creates the dropdown listing tools for selection
     */
    getTools() {
        const toolsSelect = $('<select>', {id: 'admin_tool'})
            .append($('<option>', {text: 'Select your tool'}))
            .append(this.availableTools.map(
                toolData => $('<option>', {value: toolData.key, text: toolData.name})
            ));

        this._toolContent = $('<div>', {id: 'tools_content'});
        this._toolConfirmation = $('<pre>', {id: 'tools_confirm'});

        const toolsElement = $('<div>')
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

        return toolsElement;

    }

    populateTool(response) {
        this._toolContent.empty();
        this._toolConfirmation.empty();
        $('#admin_tool').prop('disabled', false);
        if (response.error || response.request !== $('#admin_tool').val()) {
            this._toolContent.html("Request failed: " + response.error);
        }
        else {
            const toolData = this.availableTools.find(tool => tool.key === response.request);
            this._toolContent.html(toolData.getContent(response, this._chatClient));
        }
    }

    toolConfirm(message) {
        $('#tools_confirm').text(message);
    }

    _getToolData(tool) {
        $('#tools_confirm').empty();
        this._chatClient.requestData(tool);
        $('#admin_tool').prop('disabled', true);
        return 'Loading...';
    }
}
