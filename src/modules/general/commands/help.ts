import {WrappedClient} from "../../../client";
import {ArgumentMap} from "../../../util/commands/ArgumentMap";
import {CommandPathArgument} from "../../../util/commands/arguments/CommandPathArgument";
import {CommandInfo} from "../../../util/commands/CommandInfo";
import {VTCommand} from "../../../util/commands/VTCommand";
import {getInfoEmbed} from "../../../util/EmbedUtil";

export class Help extends VTCommand {
    label = "help";

    arguments = [
        new CommandPathArgument()
            .setIdentifier("command")
            .setName("command")
            .setRequired(false)
    ]

    run = async (client: WrappedClient, info: CommandInfo, argumentMap: ArgumentMap) => {
        if (argumentMap.has("command")) { // Offer help for specific command
            let path: string[] = argumentMap.get<string>("command").split(":");
            let cmd = client.commands.get(path.shift());
            while (path.length) cmd = cmd.subcommands.get(path.shift());
            const pathString = cmd.getPath(" ");
            await info.channel.send(
                getInfoEmbed()
                    .setTitle(`Help for command \`\`${pathString}\`\``)
                    .addField("Category", cmd.category, true)
                    .addField("_ _", "_ _", true)
                    .addField("Usage", `\`${info.prefix}${cmd.getUsage()}\``, true)
                    .addField("Sub Commands", cmd.subcommands.values().map(c => `${c.label} - ${c.description}`).join("\n") || "No subcommands")
                    .getAsEmbed()
            )
            return;
        }

        const cmds: VTCommand[] = client.commands
            .map(v => v)
            .filter(cmd => cmd.label != "help")
        const categories: string[] = [...new Set(cmds.map(v => v.category))];

        const cmdlist = categories
            .map(category => {
                let categoryCmdsCount = cmds.filter(cmd => cmd.category === category).length
                let categoryCommands = cmds
                    .filter(cmd => cmd.category === category)
                    .map(cmd => `\`${cmd.label}\``)
                    .join(", ")
                return `**${category} - [${categoryCmdsCount}]**\n${categoryCommands}`
            })
            .join("\n")

        const embed = getInfoEmbed()
            .setTitle("Help for HoneyBeeDevelopment")
            .setThumbnail(client.user.avatarURL())
            .setDescription(`Below you can find commands that you can use, for more information you can do \`${info.prefix}help <command>\`.\n\n${cmdlist}`)

        await info.channel.send(embed.getAsEmbed());
    };
}
