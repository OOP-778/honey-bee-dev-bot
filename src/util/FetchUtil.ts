import {Channel, Guild, GuildMember, Message, Role, TextChannel, User} from "discord.js";
import {WrappedClient} from "../client";
import {CommandInfo} from "./commands/CommandInfo";

export async function getChannel(id: string, info?: CommandInfo): Promise<Channel> {
    let parsedId = id.startsWith("<#") ? id.slice(2, -1) : id;
    let channel = WrappedClient.instance.channels.cache.get(parsedId);
    if (channel === undefined || channel === null)
        try {
            channel = await WrappedClient.instance.channels.fetch(parsedId);
        } catch {
        }
    if (channel === undefined && info)
        channel = info.guild.channels.cache.find(v => v.name.toLowerCase() === id);

    return channel;
}

export async function getGuild(id: string): Promise<Guild> {
    try {
        const guild = await WrappedClient.instance.guilds.fetch(id);
        return guild;
    } catch {
        return undefined;
    }
}

export async function getRole(input: string, guild: Guild): Promise<Role> {
    let parsedId = input.startsWith("<&") ? input.slice(2, -1) : input;
    let role: Role = guild.roles.cache.get(parsedId);
    if (role === undefined || role === null)
        try {
            role = await guild.roles.fetch(parsedId);
        } catch {
        }
    if (role === undefined || role === null) {
        role = guild.roles.cache.find(v => v.name === input);
    }

    return role;
}

export async function getUser(id: string): Promise<User> {
    let user: User;
    let parsedId = id.startsWith("<@!") ? id.slice(3, -1) : (id.startsWith("<@") ? id.slice(2, -1) : id);
    try {
        user = WrappedClient.instance.users.cache.get(parsedId);
        if (user === undefined) user = await WrappedClient.instance.users.fetch(parsedId);
    } catch (err) {
        console.log(`Was not able to get user: ${err.message}`)
    }
    return user;
}

export async function getMessage(id: string, channel: TextChannel = undefined): Promise<Message> {
    const fetchMessage = async (channel, id) => {
        try {
            let message = channel.messages.cache.get(id)
            if (message) return message

            return await channel.messages.fetch(id)
        } catch {
            return undefined
        }
    }

    if (channel == undefined) {
        for (let channel of WrappedClient.instance.guild.channels.cache.values()) {
            if (channel.type != 'text') continue

            let message = await fetchMessage(channel, id);
            if (message == undefined) continue

            return message
        }
    } else
        return await fetchMessage(channel, id)
}

export async function getMember(guild: Guild, user: string): Promise<GuildMember> {
    try {
        return await guild.members.fetch(user);
    } catch {
        return undefined;
    }
}
