import ToolsBase from "./ToolsBase";

let _instance;

export class AdminTools extends ToolsBase {
    constructor(chatClient) {
        super(chatClient);

        this._chatClient.requestToolList('admin');
    }

    static instance(chatClient) {
        if (!_instance) {
            _instance = new AdminTools(chatClient);
        }
        return _instance;
    }
}