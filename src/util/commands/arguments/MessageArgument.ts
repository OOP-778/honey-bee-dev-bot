import {CommandArgument} from "../CommandArgument";
import {Message} from "discord.js";
import {ArgumentMap} from "../ArgumentMap";
import {CommandInfo} from "../CommandInfo";
import {getMessage} from "../../FetchUtil";

export class MessageArgument extends CommandArgument<Message> {
    identifier = "message";
    name = "A messsage";
    description = "A discord message";
    fallback = false;
    required = true;

    parse = async (input: string, argmap: ArgumentMap, info: CommandInfo) => await getMessage(input.split(" ")[0]);

    slice = (input: string, argmap: ArgumentMap, parsed?: Message) => parsed ? input.split(" ").slice(1).join(" ") : input;

    serialize = (input: string, argmap: ArgumentMap, parsed?: Message) => parsed ? parsed.id : "0";

    toDisplay = (input: string, argmap: ArgumentMap, parsed?: Message) => parsed ? `${parsed.id}` : "Unknown Message";
}
