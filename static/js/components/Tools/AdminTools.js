import ToolsBase from "./ToolsBase";

let _instance;

export class AdminTools extends ToolsBase {
    constructor(chatClient) {
        super(chatClient);
        this.modalId = 'admin_tools_modal';
    }

    getToolsContent() {
        this.debug('Requesting admin tool list.');
        this._chatClient.requestToolList('admin');
        return super.getToolsContent();
    }

    static instance(chatClient) {
        if (!_instance) {
            _instance = new AdminTools(chatClient);
        }
        return _instance;
    }
}