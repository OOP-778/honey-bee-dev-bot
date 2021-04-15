import {Guild} from "discord.js";
import {getGuild} from "../../FetchUtil";
import {ArgumentMap} from "../ArgumentMap";
import {CommandArgument} from "../CommandArgument";
import {CommandInfo} from "../CommandInfo";

export class GuildArgument extends CommandArgument<Guild> {

    identifier = "guild";
    name = "A guild";
    description = "A discord guild";
    fallback = false;
    required = true;

    parse = async (input: string, argmap: ArgumentMap, info: CommandInfo) => await getGuild(input.split(" ")[0],);

    slice = (input: string, argmap: ArgumentMap, parsed?: Guild) => parsed ? input.split(" ").slice(1).join(" ") : input;

    serialize = (input: string, argmap: ArgumentMap, parsed?: Guild) => parsed ? parsed.id : "0";

    toDisplay = (input: string, argmap: ArgumentMap, parsed?: Guild) => parsed ? `${parsed.name} (${parsed.id})` : "Unknown guild";
}