import {WrappedClient} from "../../../client";
import {ArgumentMap} from "../ArgumentMap";
import {CommandArgument} from "../CommandArgument";
import {CommandInfo} from "../CommandInfo";

export class CommandPathArgument extends CommandArgument<string> {

    constructor() {
        super();
        this.identifier = "command";
        this.name = "A command";
        this.description = "A specific command with possible subcommands";
        this.fallback = false;
        this.required = true;
    }

    parse = (input: string, argmap: ArgumentMap, info: CommandInfo) => {
        let args = input.toLowerCase().split(" ");
        let command = WrappedClient.instance.commands.get(args.shift());
        if (command === undefined) return undefined;
        while (args.length) {
            if (!command.subcommands.has(args[0])) break;
            command = command.subcommands.get(args.shift());
        }
        return command.getPath();
    }

    slice = (input: string, argmap: ArgumentMap, parsed?: string) => parsed ? input.split(" ").slice(parsed.split(":").length).join(" ") : input;

    serialize = (input: string, argmap: ArgumentMap, parsed?: string) => parsed;

    toDisplay = (input: string, argmap: ArgumentMap, parsed?: string) => `${parsed.split(":").join(" ")}`;
}