import {ArgumentMap} from "../ArgumentMap";
import {CommandArgument} from "../CommandArgument";

export class StringArgument extends CommandArgument<string> {

    limit: number;

    constructor() {
        super();
        this.identifier = "string";
        this.name = "A string";
        this.description = "A series of characters";
        this.fallback = false;
        this.required = true;
        this.limit = -1;
    }

    setLimit = (amount: number): StringArgument => {
        this.limit = amount;
        return this;
    }

    parse = (input: string) => {
        let strings = input.split(" ");
        if (this.limit != -1)
            strings = strings.slice(0, this.limit);

        return strings.join(" ");
    }

    slice = (input: string, argmap: ArgumentMap, parsed?: string) => parsed ? input.slice(parsed.length) : input;

    serialize = (input: string, argmap: ArgumentMap, parsed?: any) => parsed;

    toDisplay = (input: string, argmap: ArgumentMap, parsed?: any) => `\`\`${parsed}\`\``;
}