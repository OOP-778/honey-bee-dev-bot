import {VTCommand} from "../../../util/commands/VTCommand";
import {WrappedClient} from "../../../client";
import {CommandInfo} from "../../../util/commands/CommandInfo";
import {ArgumentMap} from "../../../util/commands/ArgumentMap";
import TimezoneArg, {getCurrentTime} from "../util";
import {User, Users} from "../users";
import {getInfoEmbed, getSuccessEmbed} from "../../../util/EmbedUtil";
import {toMillis} from "../../../util/TimeUtil";
import {safeDelete} from "../../../util/misc";
import {memberContainsRoles} from "../../../util/memberUtil";

export class ClockCommand extends VTCommand {
    label: string = "clock"
    category = "Misc"

    constructor() {
        super();
        this.registerSubcommand(new ToggleCmd())
        this.registerSubcommand(new InfoCmd())
        this.registerSubcommand(new SetTimeZoneCmd())
    }

    requirements = [
        {
            checker: async (client: WrappedClient, info: CommandInfo) => {
                return (await info.fetchMember()).hasPermission("ADMINISTRATOR")
                    || await memberContainsRoles(await info.fetchMember(), ["797526745002934302", "795570131107315763"])
            },
            message: async () => "You don't have permission!"
        }
    ]
}

class SetTimeZoneCmd extends VTCommand {
    label: string = "setTimezone"
    type: string = "sub"
    description = "Set timezone of your clock"

    arguments = [
        new TimezoneArg()
            .setRequired(true)
    ]

    run = async (client: WrappedClient, info: CommandInfo, argumentMap: ArgumentMap) => {
        let timezone = argumentMap.get<string>(`timezone`);
        const user = await client.module<Users>("users").findItemOrInsert(info.author.id, () => new User(info.author.id))
        user.timezone = timezone
        info.channel.send(getSuccessEmbed()
            .setDescription(`Set your clock's timezone to ${timezone}`)
            .getAsEmbed())
            .then(message => safeDelete(message, toMillis(4)))

        user.save()
    }
}

class ToggleCmd extends VTCommand {
    label: string = "toggle"
    type: string = "sub"
    description = "Toggle your clock"

    run = async (client: WrappedClient, info: CommandInfo, argumentMap: ArgumentMap) => {
        const user = await client.module<Users>("users").findItemOrInsert(info.author.id, () => new User(info.author.id))
        user.clockEnabled = !user.clockEnabled
        info.channel.send(getSuccessEmbed()
            .setDescription(`Toggled clock state to ${user.clockEnabled ? "Enabled" : "Disabled"}`)
            .getAsEmbed())
            .then(message => safeDelete(message, toMillis(4)))
        user.save()

        if (!user.clockEnabled)
            await (await info.fetchMember()).setNickname(info.author.username)
    }
}

class InfoCmd extends VTCommand {
    label: string = "info"
    type: string = "sub"
    description = "Get info about your clock"

    run = async (client: WrappedClient, info: CommandInfo, argumentMap: ArgumentMap) => {
        const user = await client.module<Users>("users").findItemOrInsert(info.author.id, () => new User(info.author.id))
        info.channel.send(
            getInfoEmbed()
                .setTitle(`${info.author.username}'s Clock Info`)
                .addField("State", `${user.clockEnabled ? "Enabled" : "Disabled"}`)
                .addField("Time zone", `${user.timezone}`)
                .addField("Current Time", `${getCurrentTime().toUpperCase()}`)
                .getAsEmbed()
        ).then(message => {
            safeDelete(message, toMillis(10))
            safeDelete(info.message, toMillis(10))
        })
    }
}