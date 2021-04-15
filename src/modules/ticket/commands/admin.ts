import {VTCommand} from "../../../util/commands/VTCommand";
import {CommandInfo} from "../../../util/commands/CommandInfo";
import {WrappedClient} from "../../../client";
import {Tickets, TicketType} from "../tickets";
import {ArgumentMap} from "../../../util/commands/ArgumentMap";
import {StringArgument} from "../../../util/commands/arguments/StringArgument";
import {getErrorEmbed, getInfoEmbed, getSuccessEmbed} from "../../../util/EmbedUtil";
import {toMillis} from "../../../util/TimeUtil";
import {TicketTypeDashboard} from "../util/ticketTypeDashboard";
import {ChannelArgument} from "../../../util/commands/arguments/ChannelArgument";
import {CategoryChannel, Channel, TextChannel} from "discord.js";
import {reactTo} from "../../../util/EmojiUtil";
import {getMessage} from "../../../util/FetchUtil";

export class TicketsAdmin extends VTCommand {
    requirements = [
        {
            checker: async (client: WrappedClient, info: CommandInfo) => {
                return (await info.fetchMember()).hasPermission("ADMINISTRATOR")
            },
            message: async () => "You don't have administrator."
        }
    ]

    label = "admin"
    description = "All ticket administration commands"
    type = "sub"
    allowInDMs = true

    constructor() {
        super();
        this.registerSubcommand(new CreateType())
        this.registerSubcommand(new EditType())
        this.registerSubcommand(new SetListChannel())
        this.registerSubcommand(new UpdateMessage())
        this.registerSubcommand(new SetCreationCategory())
        this.registerSubcommand(new SetNeedsResponseCategory())
        this.registerSubcommand(new SetAnsweredCategory())
    }
}

class CreateType extends VTCommand {
    label = "create";
    type = "sub"
    description = "Create new ticket type"

    arguments = [
        new StringArgument()
            .setName("name")
            .setDescription("Name of the ticket type")
            .setIdentifier("name")
            .setRequired(true)
    ]

    run = async (client: WrappedClient, info: CommandInfo, argumentMap: ArgumentMap) => {
        const ticketsSettings = client.module<Tickets>("tickets").settings
        const ticketType = argumentMap.get<string>("name")

        if (Array.from(ticketsSettings.types.keys()).find(value => value == ticketType) !== undefined)
            return info.channel.send(getErrorEmbed()
                .setDescription(`A ticket type by name "${ticketType}" doesn't exist!`)
                .getAsEmbed())
                .then(message => message.delete({timeout: toMillis(4)}))

        const ticketTypeObj = new TicketType()
        ticketTypeObj.name = ticketType
        await new TicketTypeDashboard(ticketTypeObj, info).open()
    }
}

class SetListChannel extends VTCommand {
    label = "setListChannel"
    type = "sub"
    description = "Set channel where ticket types will be listed"

    arguments = [
        new ChannelArgument()
            .setRequired(true)
    ]

    run = async (client: WrappedClient, info: CommandInfo, argumentMap: ArgumentMap) => {
        let channel = argumentMap.get<TextChannel>("channel");
        if (channel.type !== 'text') {
            return info.channel.send(
                getErrorEmbed()
                    .setDescription("The channel is not a text one")
                    .getAsEmbed()
            ).then(message => message.delete({timeout: toMillis(4)}))
        }

        const tickets = client
            .module<Tickets>("tickets")
        tickets
            .settings
            .ticketListChannelID = channel.id

        info.channel
            .send(getSuccessEmbed()
                .setDescription(`Set the list channel to ${(channel as TextChannel).name}`).getAsEmbed())
            .then(message => message.delete({timeout: toMillis(5)}))

        await tickets.syncSettings()
    }
}

class EditType extends VTCommand {
    label = "edit";
    type = "sub"
    description = "Edit ticket type"

    arguments = [
        new StringArgument()
            .setName("name")
            .setDescription("Name of the ticket type")
            .setIdentifier("name")
            .setRequired(true)
    ]

    run = async (client: WrappedClient, info: CommandInfo, argumentMap: ArgumentMap) => {
        const ticketsSettings = client.module<Tickets>("tickets").settings
        const ticketType = argumentMap.get<string>("name")

        const ticketTypeObj = Array.from(ticketsSettings.types.values()).find(value => value.name == ticketType)
        if (ticketTypeObj == undefined)
            return info.channel.send(getErrorEmbed()
                .setDescription(`A ticket type by name "${ticketType}" doesn't exist!`)
                .getAsEmbed())
                .then(message => message.delete({timeout: toMillis(4)}))

        await new TicketTypeDashboard(ticketTypeObj, info).open()
    }
}

class SetNeedsResponseCategory extends VTCommand {
    label = "setNeedsResponseCategory"
    type = "sub"
    description = "Set category where answered tickets will go"

    arguments = [
        new ChannelArgument()
            .setRequired(true)
    ]

    run = async (client: WrappedClient, info: CommandInfo, argumentMap: ArgumentMap) => {
        let channel = argumentMap.get<Channel>("channel");
        if (channel.type !== 'category') {
            return info.channel.send(
                getErrorEmbed()
                    .setDescription("The channel is not a category one")
                    .getAsEmbed()
            ).then(message => message.delete({timeout: toMillis(4)}))
        }

        const tickets = client
            .module<Tickets>("tickets")

        tickets
            .settings
            .needsAnswerCategoryID = channel.id

        info.channel
            .send(getSuccessEmbed()
                .setDescription(`Set the needs answer category channel to ${(channel as CategoryChannel).name}`).getAsEmbed())
            .then(message => message.delete({timeout: toMillis(5)}))

        await tickets.syncSettings()
    }
}

class SetAnsweredCategory extends VTCommand {
    label = "setAnsweredCategory"
    type = "sub"
    description = "Set category where answered tickets will go"

    arguments = [
        new ChannelArgument()
            .setRequired(true)
    ]

    run = async (client: WrappedClient, info: CommandInfo, argumentMap: ArgumentMap) => {
        let channel = argumentMap.get<Channel>("channel");
        if (channel.type !== 'category') {
            return info.channel.send(
                getErrorEmbed()
                    .setDescription("The channel is not a category one")
                    .getAsEmbed()
            ).then(message => message.delete({timeout: toMillis(4)}))
        }

        const tickets = client
            .module<Tickets>("tickets")

        tickets
            .settings
            .answeredCategoryID = channel.id

        info.channel
            .send(getSuccessEmbed()
                .setDescription(`Set the answered category channel to ${(channel as CategoryChannel).name}`).getAsEmbed())
            .then(message => message.delete({timeout: toMillis(5)}))

        await tickets.syncSettings()
    }
}

class SetCreationCategory extends VTCommand {
    label = "setCreationCategory"
    type = "sub"
    description = "Set category where creation of tickets will happen"

    arguments = [
        new ChannelArgument()
            .setRequired(true)
    ]

    run = async (client: WrappedClient, info: CommandInfo, argumentMap: ArgumentMap) => {
        let channel = argumentMap.get<Channel>("channel");
        if (channel.type !== 'category') {
            return info.channel.send(
                getErrorEmbed()
                    .setDescription("The channel is not a category one")
                    .getAsEmbed()
            ).then(message => message.delete({timeout: toMillis(4)}))
        }

        const tickets = client
            .module<Tickets>("tickets")

        tickets
            .settings
            .tempCategoryId = channel.id

        info.channel
            .send(getSuccessEmbed()
                .setDescription(`Set the temp category channel to ${(channel as CategoryChannel).name}`).getAsEmbed())
            .then(message => message.delete({timeout: toMillis(5)}))

        await tickets.syncSettings()
    }
}

class UpdateMessage extends VTCommand {
    label = "updateListMessage"
    type = "sub"
    description = "Update ticket list message"

    run = async (client: WrappedClient, info: CommandInfo) => {
        const tickets = client.module<Tickets>("tickets")
        const settings = client.module<Tickets>("tickets").settings

        // If no ticket list channel id is set, return
        if (settings.ticketListChannelID === undefined) {
            return info.channel.send(getErrorEmbed()
                .setDescription("Tickets list channel id is not present!")
                .getAsEmbed())
                .then(message => message.delete({timeout: toMillis(5)}))
        }

        // Find channel from the id
        const ticketListChannel = Array.from(
            WrappedClient.instance.guild.channels.cache
                .values()
        )
            .find(channel => channel.id === settings.ticketListChannelID) as TextChannel
        if (ticketListChannel === undefined) {
            return info.channel.send(getErrorEmbed()
                .setDescription("Tickets list channel is not present!")
                .getAsEmbed())
                .then(message => message.delete({timeout: toMillis(5)}))
        }

        const types = Array.from(settings.types.values())
            .filter(ticket => ticket.isReady().length == 0)

        if (types.length == 0) {
            return info.channel.send(getErrorEmbed()
                .setDescription("None of the ticket types are ready!")
                .getAsEmbed())
                .then(message => message.delete({timeout: toMillis(5)}))
        }

        let message = await getMessage(settings.ticketMessageID, ticketListChannel)

        const typesEmbed = getInfoEmbed()
            .setTitle("Create a ticket!")
            .setDescription("Here you can find available ticket types, in order to open one, please react with specific emoji.")
            .addField("List of tickets", `
            ${types
                .map(ticket => ticket.name + " - " + ticket.description + " (" + ticket.emoji + ")")
                .join("\n")
            }`)

        info.channel
            .send(getSuccessEmbed()
                .setDescription("Updated tickets list message!").getAsEmbed())
            .then(message => message.delete({timeout: toMillis(5)}))

        const react = async () => {
            for (let type of types) {
                await reactTo(message, type.emoji)
            }
        }

        if (message === undefined) {
            message = await ticketListChannel.send(typesEmbed.getAsEmbed())
            settings.ticketMessageID = message.id
            await react()
            return await tickets.syncSettings()
        }

        await message.edit(typesEmbed.getAsEmbed())
        await message.reactions.removeAll()
        await react()
    }
}
