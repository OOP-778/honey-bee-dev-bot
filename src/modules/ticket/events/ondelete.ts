import {VTEvent} from "../../../util/events/VTEvent";
import {Channel, ClientEvents, TextChannel} from "discord.js";
import {WrappedClient} from "../../../client";
import {Tickets} from "../tickets";

export class onDelete extends VTEvent {
    eventName: keyof ClientEvents = "channelDelete"
    eventType: string = "on"

    execute = async (client: WrappedClient, channel: Channel) => {
        if (channel.type !== 'text') return
        if ((channel as TextChannel).parent == null) return

        await WrappedClient.instance
            .module<Tickets>("tickets")
            .ticketManager
            .deleteItemBy(channel.id)
    }
}