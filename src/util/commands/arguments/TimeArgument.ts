import {parseMillisToTime, parseTimeToMillis} from "../../TimeUtil";
import {ArgumentMap} from "../ArgumentMap";
import {CommandArgument} from "../CommandArgument";
import {CommandInfo} from "../CommandInfo";


export class TimeArgument extends CommandArgument<number> {
    constructor() {
        super();
        this.identifier = "time";
        this.name = "time";
        this.description = "A specific amount of time";
        this.fallback = false;
        this.required = true;
    }

    parse = (input: string, argmap: ArgumentMap, info: CommandInfo) => parseTimeToMillis(input.split(" ")[0]);

    slice = (input: string, argmap: ArgumentMap, parsed?: any) => parsed ? input.split(" ").slice(1).join(" ") : input;

    serialize = (input: string, argmap: ArgumentMap, parsed?: any) => parsed;

    toDisplay = (input: string, argmap: ArgumentMap, parsed?: any) => `\`${parseMillisToTime(parsed)}\``;
}