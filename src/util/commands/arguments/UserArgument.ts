import {User} from "discord.js";
import {getUser} from "../../FetchUtil";
import {ArgumentMap} from "../ArgumentMap";
import {CommandArgument} from "../CommandArgument";
import {CommandInfo} from "../CommandInfo";

export class UserArgument extends CommandArgument<User> {

    identifier = "user";
    name = "A user";
    description = "A discord user";
    fallback = false;
    required = true;

    parse = async (input: string, argmap: ArgumentMap, info: CommandInfo) => await getUser(input.split(" ")[0],);

    slice = (input: string, argmap: ArgumentMap, parsed?: User) => parsed ? input.split(" ").slice(1).join(" ") : input;

    serialize = (input: string, argmap: ArgumentMap, parsed?: User) => parsed ? parsed.id : "0";

    toDisplay = (input: string, argmap: ArgumentMap, parsed?: User) => parsed ? `${parsed.tag} (${parsed.id})` : "Unknown user";
}