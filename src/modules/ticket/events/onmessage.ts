import {VTEvent} from "../../../util/events/VTEvent";
import {CategoryChannel, ClientEvents, Message} from "discord.js";
import {WrappedClient} from "../../../client";
import {Tickets, TicketType} from "../tickets";

export class OnMessage extends VTEvent {
    eventName: keyof ClientEvents = "message"
    eventType = "on"

    execute = async (client: WrappedClient, message: Message) => {
        if (message.author.id === client.user.id) return
        if (message.channel.type == 'dm') return
        if (message.author.bot) return

        const tickets = WrappedClient
            .instance
            .module<Tickets>("tickets")
        const ticket = await tickets
            .ticketManager
            .findItemBy(message.channel.id)
        if (ticket == undefined) return

        const ticketType: TicketType = tickets.settings.types.get(ticket.type)
        const isUser = [...ticket.affiliates, ticket.ownerID].find(id => id === message.author.id) != undefined

        if (ticket.lastAnswer == "user" && isUser) return
        if (ticket.lastAnswer == "support" && !isUser) return

        if (ticket.lastAnswer == "support" && isUser)
            message
                .channel
                .send(ticketType.supportRoleIds.map(role => `<@&${role}>`).join(", ")).then(message => message.delete({timeout: 1}))
        else
            message
                .channel
                .send([...ticket.affiliates, ticket.ownerID].map(id => `<@${id}>`).join(", ")).then(message => message.delete({timeout: 1}))

        ticket.lastAnswer = ticket.lastAnswer == "user" ? "support" : "user"
        await message.channel
            .setParent(Array.from(client.guild.channels.cache.values())
                .find(channel => channel.type == 'category' && (ticket.lastAnswer == "user" ? channel.id == tickets.settings.needsAnswerCategoryID : channel.id == tickets.settings.answeredCategoryID)) as CategoryChannel, {lockPermissions: false})

        ticket.save()
    }
}
