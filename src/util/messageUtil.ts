import {Message} from "discord.js";

export async function modifyMessageSafely(message: Message, consumer: (message: Message) => void, delay: number = 0) {
    const modify = async () => {
        try {
            await message.channel.fetch(true)
        } catch (e) {
            return
        }
        try {
            let fetchedMessage = await message.channel.messages.fetch(message.id);
            await consumer(fetchedMessage);
        } catch (e) {
        }
    }

    if (delay <= 0)
        await modify()
    else
        setTimeout( () => {
            modify()
        }, delay)
}