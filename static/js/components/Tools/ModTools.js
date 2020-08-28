import ToolsBase from "./ToolsBase";

let _instance;

export class ModTools extends ToolsBase {
    constructor(chatClient) {
        super(chatClient);
        this.modalId = 'mod_tools_modal';
    }

    getToolsContent() {
        this.debug('Requesting mod tool list.');
        this._chatClient.requestToolList('mod');
        return super.getToolsContent();
    }

    static instance(chatClient) {
        if (!_instance) {
            _instance = new ModTools(chatClient);
        }
        return _instance;
    }
}