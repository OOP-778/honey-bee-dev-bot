import {VTEvent} from "../../../util/events/VTEvent";
import {ClientEvents, Message} from "discord.js";
import {WrappedClient} from "../../../client";
import {reactTo} from "../../../util/EmojiUtil";

export class OnMessage extends VTEvent {
    eventName: keyof ClientEvents = "message"
    eventType = "on"

    execute = async (client: WrappedClient, message: Message) => {
        if (message.channel.type == 'dm') return
        if (message.channel.id !== "797528892108701796") return

        await reactTo(message, "<:agree:801824298872209429>")
        await reactTo(message, "<:disagree:801824437811806208>")
    }
}