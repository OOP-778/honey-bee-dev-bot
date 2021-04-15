import {VTCommand} from "../../../util/commands/VTCommand";
import {WrappedClient} from "../../../client";
import {CommandInfo} from "../../../util/commands/CommandInfo";
import {ArgumentMap} from "../../../util/commands/ArgumentMap";
import {User, Users} from "../users";
import {UserDashboard} from "../dashboard/userdashboard";
import {TextChannel} from "discord.js";

export class DashboardCmd extends VTCommand {
    label = "dashboard";
    onlyInDMs = true

    run = async (client: WrappedClient, info: CommandInfo, argumentMap: ArgumentMap) => {
        const user = await client.module<Users>("users").findItemOrInsert(info.author.id, () => new User(info.author.id))
        const dashboard = new UserDashboard(await info.fetchMember(), user, info.channel as TextChannel)

        await dashboard.open()
    }
}