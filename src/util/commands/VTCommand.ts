import {WrappedClient} from "../../client";
import {EnhancedMap} from "../EnhancedMap";
import {ArgumentMap} from "./ArgumentMap";
import {CommandArgument} from "./CommandArgument";
import {CommandInfo} from "./CommandInfo";

export abstract class VTCommand {

    abstract label: string;
    aliases?: string[];
    type: string = "default";
    parent?: VTCommand;
    subcommands: EnhancedMap<VTCommand>;
    defaultSub?: string;
    defaultLevel: number = 0;
    arguments?: CommandArgument<any>[];
    allowInDMs: boolean = false;
    onlyInDMs: boolean = false
    category: string = "Other";
    description: string = "No description set";

    requirements: CommandRequirement[]

    run: (client: WrappedClient, info: CommandInfo, argumentMap: ArgumentMap) => void;

    constructor() {
        this.subcommands = new EnhancedMap()
    }

    registerSubcommand(cmd: VTCommand) {
        cmd.parent = this;
        this.subcommands.set(cmd.label.toLowerCase(), cmd);
    }

    getPath(joiner: string = ":"): string {
        let array = [this.label];
        let current = this.parent;
        while (current !== undefined) {
            array.push(current.label);
            current = current.parent;
        }
        return array.reverse().join(joiner);
    }

    getUsage(): string {
        let usage = "";
        usage += this.getPath(" ");
        if (this.arguments)
            for (const arg of this.arguments) {
                if (arg.required) usage += ` <${arg.name}>`;
                else usage += ` [${arg.name}]`;
            }
        return usage;
    }
}

export interface CommandRequirement {
    checker: ((client: WrappedClient, info: CommandInfo) => Promise<boolean>)
    message: ((client: WrappedClient, info: CommandInfo) => Promise<string>)
}