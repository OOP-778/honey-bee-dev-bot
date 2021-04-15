import {ClientEvents, Message} from "discord.js";
import {WrappedClient} from "../../../client";
import {ArgumentMap} from "../../../util/commands/ArgumentMap";
import {ArgumentValues, CommandArgument} from "../../../util/commands/CommandArgument";
import {CommandInfo} from "../../../util/commands/CommandInfo";
import {VTCommand} from "../../../util/commands/VTCommand";
import {VTEvent} from "../../../util/events/VTEvent";
import {getErrorEmbed, getInfoEmbed} from "../../../util/EmbedUtil";
import {safeDelete} from "../../../util/misc";
import {modifyMessageSafely} from "../../../util/messageUtil";
import {toMillis} from "../../../util/TimeUtil";

export class OnCommand extends VTEvent {
    eventName: keyof ClientEvents = "message";
    eventType = "on";

    execute = async (client: WrappedClient, message: Message) => {
        if (message.author.id === client.user.id) return; // Message sender is bot
        if (message.author.id === client.user.id) return; // Message sender is bot
        const cmdinfo = new CommandInfo(message);

        if (!(message.content.startsWith(cmdinfo.prefix) || (message.mentions.users.has(client.user.id)))) return; // Ignore messages that do not have prefix
        let sliceLength = message.content.startsWith(cmdinfo.prefix) ? cmdinfo.prefix.length : client.user.id.length + 4; // Get amount of characters before command

        const args: string[] = message.content.slice(sliceLength).trim().split(" ");
        const command: string = args.shift().toLowerCase().trim();

        if (client.commands.has(command) || client.aliases.has(command)) {
            const cmd: VTCommand = client.commands.get(command) || client.aliases.get(command);

            return runCommand(client, cmdinfo, cmd, args);
        }

        if (message.mentions.users.has(client.user.id) && command.length === 0) {
            return message.channel.send(
                getInfoEmbed()
                    .setTitle(`Prefix for ${cmdinfo.guild ? cmdinfo.guild.name : "DM"}`)
                    .setDescription(`
                    My prefix is \`${cmdinfo.prefix}\``)
                    .getAsEmbed()
            )
        }
    };

}

export async function runCommand(client: WrappedClient, info: CommandInfo, cmd: VTCommand, args: string[], argmap?: ArgumentMap) {
    if (argmap === undefined) argmap = new ArgumentMap();

    if (info.channel.type !== 'dm')
        modifyMessageSafely(info.message, (_) => info.message.delete(), toMillis(20))

    if (cmd.onlyInDMs && info.channel.type != 'dm') {
        return info.channel.send(
            getErrorEmbed()
                .setTitle(`You can only use this command in dms!`)
                .getAsEmbed()
        )
    }

    /*
    Check for requirements
    */
    if (cmd.requirements != undefined) {
        for (let requirement of cmd.requirements) {
            const meets = await requirement.checker(client, info)
            if (!meets) {
                return info.channel.send(
                    getErrorEmbed()
                        .setTitle(`You don't meet the requirements to use this command.`)
                        .setDescription(await requirement.message(client, info))
                        .getAsEmbed()
                )
            }
        }
    }

    /*
        Check arguments
    */

    if (cmd.arguments !== undefined) {
        for (const arg of cmd.arguments) {
            try {
                const valueObject: ArgumentValues<any> = await arg.getValues(args.join(" ").trimStart(), argmap, info);
                if (valueObject.value === undefined) continue;
                argmap.setValues(arg.identifier, valueObject);
                args = valueObject.output.split(" ");
            } catch {
                break;
            }
        }

        const missing: CommandArgument<any>[] = cmd.arguments.filter(a => a.required && !argmap.has(a.identifier));

        if (missing.length > 0) {
            return info.channel.send(
                getErrorEmbed()
                    .setTitle("Missing or invalid arguments")
                    .setDescription(`Correct usage: \`${info.prefix}${cmd.getUsage()}\`\n${missing.map(a => `\`${a.identifier}\` - ${a.description}`).join("\n")}`)
                    .getAsEmbed()
            ).then(message => modifyMessageSafely(message, () => message.delete(), toMillis(5)))
        }
    }

    /*
        Check subcommands
    */
    if ((args.length > 0 || cmd.defaultSub) && cmd.subcommands.size() > 0) {
        const subcmd = args[0]?.toLowerCase()?.trim();
        if (cmd.subcommands.has(subcmd)) args.shift();

        let subcommand: VTCommand = cmd.subcommands.get(subcmd) || cmd.subcommands.get(cmd.defaultSub);
        if (subcommand !== undefined)
            return runCommand(client, info, subcommand, args, argmap);

        else {
            return info.channel.send(
                getErrorEmbed()
                    .setTitle(`Invalid Sub Command for ${cmd.label}`)
                    .addField(
                        "Sub Commands",
                        `${cmd.subcommands.values().map(cmd => cmd.label + " - " + cmd.description).join("\n")}`
                    )
                    .getAsEmbed()
            ).then(message => modifyMessageSafely(message, () => message.delete(), toMillis(5)))
        }
    }

    if (cmd.run == undefined) return

    /*
        Execute command
    */
    cmd.run(client, info, argmap);
}
