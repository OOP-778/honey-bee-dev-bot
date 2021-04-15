import {DMChannel, Guild, GuildMember, Message, NewsChannel, TextChannel, User} from "discord.js";
import {WrappedClient} from "../../client";

export class CommandInfo {

    /* General objects */
    message: Message;
    author: User;
    channel: TextChannel | DMChannel | NewsChannel;

    /* Guild objects */
    member: GuildMember;
    guild: Guild;
    isGuild: boolean;

    prefix: string;

    constructor(message: Message) {
        /* General objects */
        this.message = message;
        this.author = message.author;
        this.channel = message.channel;

        /* Guild objects */
        this.guild = WrappedClient.instance.guild
        this.isGuild = message.guild !== undefined && message.guild !== null;
        this.member = message.member;

        this.prefix = process.env.BOT_PREFIX;
    }

    async fetchMember(): Promise<GuildMember> {
        return WrappedClient.instance.guild.members.fetch(this.author.id)
    }
}
