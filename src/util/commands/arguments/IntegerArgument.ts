import {ArgumentMap} from "../ArgumentMap";
import {CommandArgument} from "../CommandArgument";

export class IntegerArgument extends CommandArgument<number> {

    identifier = "integer";
    name = "A number";
    description = "A number without any decimals";
    fallback = false;
    required = true;

    parse = (input: string) => {
        try {
            const number = parseInt(input.split(" ")[0]);
            return isNaN(number) ? undefined : number;
        } catch {
            return undefined;
        }
    };

    slice = (input: string, argmap: ArgumentMap, parsed?: number) => {
        if (parsed === undefined) return input;
        return input.split(" ").slice(1).join(" ");
    };

    serialize = (input: string, argmap: ArgumentMap, parsed?: number) => parsed.toString();

    toDisplay = (input: string, argmap: ArgumentMap, parsed?: any) => parsed.toString();
}