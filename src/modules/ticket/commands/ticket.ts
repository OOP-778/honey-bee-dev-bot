import {VTCommand} from "../../../util/commands/VTCommand";
import {WrappedClient} from "../../../client";
import {CommandInfo} from "../../../util/commands/CommandInfo";
import {Tickets} from "../tickets";
import {UserArgument} from "../../../util/commands/arguments/UserArgument";
import {ArgumentMap} from "../../../util/commands/ArgumentMap";
import {TextChannel, User} from "discord.js";
import {getMember} from "../../../util/FetchUtil";
import {getSuccessEmbed} from "../../../util/EmbedUtil";
import {toMillis} from "../../../util/TimeUtil";
import {modifyMessageSafely} from "../../../util/messageUtil";

export class TicketCmd extends VTCommand {
    label: string = "ticket"
    category = "tickets"

    requirements = [
        {
            checker: async (client: WrappedClient, info: CommandInfo) => {
                return (await client.module<Tickets>("tickets")
                    .ticketManager
                    .findItemBy(info.channel.id)) != null
            },
            message: async () => "You can only use this command within ticket!"
        }
    ]

    constructor() {
        super();
        this.registerSubcommand(new CloseCmd())
        this.registerSubcommand(new AddAffiliate())
    }
}

export class CloseCmd extends VTCommand {
    label: string = "close"
    type = "sub"
    description = "Close the ticket"

    run = async (client: WrappedClient, info: CommandInfo) => {
        await WrappedClient.instance
            .module<Tickets>("tickets")
            .ticketManager
            .deleteItemBy(info.channel.id)

        await info.channel.delete()
    }
}

export class AddAffiliate extends VTCommand {
    label = "add"
    description = "Add affiliate"
    type = "sub"

    requirements = [
        {
            checker: async (client: WrappedClient, info: CommandInfo) => {
                const ticket = (await client.module<Tickets>("tickets")
                    .ticketManager
                    .findItemBy(info.channel.id))

                return ticket.ownerID === info.author.id || (await info.fetchMember()).hasPermission('ADMINISTRATOR')
            },
            message: async () => "Only the owner of the ticket can use this command!"
        }
    ]

    arguments = [
        new UserArgument()
    ]

    run = async (client: WrappedClient, info: CommandInfo, args: ArgumentMap) => {
        const user = args.get<User>("user")
        const member = (await getMember(WrappedClient.instance.guild, user.id))

        const ticket = (await client.module<Tickets>("tickets")
            .ticketManager
            .findItemBy(info.channel.id))

        ticket.affiliates.push(member.id)

        await (info.channel as TextChannel).updateOverwrite(member, {
            SEND_MESSAGES: true,
            ADD_REACTIONS: true,
            ATTACH_FILES: true,
            VIEW_CHANNEL: true
        })

        info.channel
            .send(getSuccessEmbed()
                .setDescription(`Added <@${member.id}> as affiliate`).getAsEmbed())
            .then(message => modifyMessageSafely(message, () => message.delete(), toMillis(4)))
    }
}