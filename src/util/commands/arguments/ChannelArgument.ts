import {Channel, TextChannel} from "discord.js";
import {getChannel} from "../../FetchUtil";
import {ArgumentMap} from "../ArgumentMap";
import {CommandArgument} from "../CommandArgument";
import {CommandInfo} from "../CommandInfo";

export class ChannelArgument extends CommandArgument<Channel> {

    identifier = "channel";
    name = "A channel";
    description = "A discord channel";
    fallback = false;
    required = true;

    parse = async (input: string, argmap: ArgumentMap, info: CommandInfo) => await getChannel(input.split(" ")[0], info);

    slice = (input: string, argmap: ArgumentMap, parsed?: TextChannel) => parsed ? input.split(" ").slice(1).join(" ") : input;

    serialize = (input: string, argmap: ArgumentMap, parsed?: TextChannel) => parsed ? parsed.id : "0";

    toDisplay = (input: string, argmap: ArgumentMap, parsed?: any) => parsed ? `<#${parsed.id}> (${parsed.id})` : "Unknown channel";
}