import {ModelHolder, MongoModel, SerializedData} from "../../../database";
import {CategoryChannel, GuildMember, TextChannel} from "discord.js";
import {Tickets, TicketType} from "../tickets";
import {toMillis} from "../../../util/TimeUtil";
import {getErrorEmbed, getInfoEmbed} from "../../../util/EmbedUtil";
import {FormPane} from "../../../util/pane/MessagePane";
import {QuestionType, registeredQuestions} from "../util/questionTypes";
import {getRole} from "../../../util/FetchUtil";

export class TicketManager extends ModelHolder<Ticket> {
    async save(item: Ticket): Promise<void> {
        return super.save(item);
    }

    tempChannels: TextChannel[]
    tickets: Tickets

    constructor(tickets: Tickets) {
        super(
            Ticket,
            "tickets",
            "channelID",
            toMillis(20),
            item => item.channelID
        );
        this.tempChannels = []
        this.tickets = tickets
    }

    async create(ticketType: TicketType, member: GuildMember) {
        // First create temp channel
        const tempCategory = Array.from(member.guild.channels.cache.values())
            .find(channel => channel.type == 'category' && channel.id == this.tickets.settings.tempCategoryId) as CategoryChannel
        if (tempCategory == null) return

        const tempChannel = await member.guild.channels.create(`pending-${member.user.username.substr(0, 6)}`, {parent: tempCategory})
        this.tempChannels.push(tempChannel)

        await tempChannel.updateOverwrite(member, {
            SEND_MESSAGES: true,
            ADD_REACTIONS: true,
            ATTACH_FILES: true,
            VIEW_CHANNEL: true
        })

        tempChannel.send(`<@${member.id}>`).then(message => message.delete())
        const message = await tempChannel.send(getInfoEmbed()
            .setDescription(`Hello ${member.nickname},\n
            I'll be guiding you to setup the ticket.
            Lemme check few things before we start...
            `)
            .getAsEmbed())

        // Check for required roles
        if (ticketType.requiredRoles.length != 0 && !member.hasPermission("ADMINISTRATOR")) {
            const memberRoles = Array.from(member.roles.cache.values())
            for (let requiredRoleId of ticketType.requiredRoles) {
                if (!memberRoles.find(role => role.id == requiredRoleId)) {
                    message.edit(
                        getInfoEmbed()
                            .setDescription(`
                            Looks like you don't have the required role to open this ticket!
                            \nYou don't have ${(await message.guild.roles.fetch(requiredRoleId)).name} role!
                            `
                            )
                            .getAsEmbed(),
                    ).then(message => {
                        setTimeout(() => {
                            message.edit(
                                getErrorEmbed()
                                    .setDescription("This channel will be deleted in 20 seconds...")
                                    .getAsEmbed(),
                            ).then(() => {
                                setTimeout(() => {
                                    this.tempChannels = this.tempChannels
                                        .filter(channel => channel.id != tempChannel.id)
                                    tempChannel.delete()
                                }, toMillis(20))
                            })
                        }, toMillis(5))
                    })
                    return
                }
            }
        }

        await message.delete()

        // If everything passed, ask the questions
        const formPane = new FormPane(tempChannel, member.user, member)
        formPane.whenCancel = () => {
            this.tempChannels = this.tempChannels
                .filter(channel => channel.id != tempChannel.id)
            tempChannel.delete()
        }

        for (let question of ticketType.questions) {
            formPane.addQuestion({
                identifier: question.displayName,
                question: question.question,
                validator: (async (questionMessage) => {
                    return registeredQuestions.get<QuestionType>(question.type).handler(questionMessage)
                })
            })
        }

        formPane.onFinish = async (pane) => {
            await tempChannel.delete()

            const ticketEmbed = getInfoEmbed()
                .setTitle(`${ticketType.name} Ticket`)
                .addField("Owner", `<@${member.id}>`)

            for (let entry of pane.answered.entries())
                ticketEmbed
                    .addField(entry.key, entry.value)

            const ticketChannel = await member.guild.channels.create(
                `${ticketType.minifiedId}-${member.user.username}`,
                {
                    parent: Array.from(member.guild.channels.cache.values())
                        .find(channel => channel.type == 'category' && channel.id == this.tickets.settings.needsAnswerCategoryID)
                }
            )

            await ticketChannel.setTopic(`use !help ticket to see commands | created at: ${Intl.DateTimeFormat("en-us").format(new Date())}, owner: ${member.user.id}, type: ${ticketType.name}`)
            await ticketChannel.send(ticketEmbed.getAsEmbed())

            await ticketChannel.updateOverwrite(member, {
                SEND_MESSAGES: true,
                ADD_REACTIONS: true,
                ATTACH_FILES: true,
                VIEW_CHANNEL: true
            })

            const supportRoles = []
            for (let supportRoleId of ticketType.supportRoleIds) {
                const role = await getRole(supportRoleId, member.guild)
                if (role === undefined) continue

                supportRoles.push(role)

                await ticketChannel.updateOverwrite(role, {
                        SEND_MESSAGES: true,
                        ADD_REACTIONS: true,
                        READ_MESSAGE_HISTORY: true,
                        MANAGE_MESSAGES: true,
                        ATTACH_FILES: true,
                        VIEW_CHANNEL: true
                    }
                )
            }

            ticketChannel.send(supportRoles.map(role => `<@&${role.id}>`).join(", ")).then(message => message.delete({timeout: 1}))

            const ticket = new Ticket()
            ticket.type = ticketType.name
            ticket.ownerID = member.id
            ticket.channelID = ticketChannel.id
            await this.save(ticket)
        }

        await formPane.send()

        setTimeout(async () => {
            await tempCategory.fetch(true)
            if (tempCategory.children.find(ch => ch.id == tempChannel.id) == undefined) return

            tempChannel.send(`<@${member.id}>`).then(message => message.delete())
            tempChannel.send(
                getErrorEmbed()
                    .setDescription("This channel will be deleted in 20 seconds because of inactivity...")
                    .getAsEmbed(),
            ).then(() => {
                setTimeout(() => {
                    this.tempChannels = this.tempChannels
                        .filter(channel => channel.id != tempChannel.id)
                    tempChannel.delete()
                }, toMillis(20))
            })
        }, toMillis(60 * 5))
    }

    async disable() {
        for (let tempChannel of this.tempChannels)
            await tempChannel.delete()
    }
}

export class Ticket extends MongoModel {
    // Type of the ticket
    type: string

    // Owner id
    ownerID: string

    // Date it was created at
    creationDate: number = new Date().getMilliseconds()

    // channelId
    channelID: string

    // Affiliates
    affiliates?: string[]

    // Last answer by
    lastAnswer: string = 'user'

    serialize(data: SerializedData) {
        data.write("channelID", this.channelID)
        data.write("type", this.type)
        data.write("ownerID", this.ownerID)
        data.write("creationDate", this.creationDate)
        data.write("affiliates", this.affiliates)
        data.write("lastAnswer", this.lastAnswer)
    }

    deserialize(data: SerializedData) {
        this.channelID = data.applyAsString("channelID")
        this.type = data.applyAsString("type")
        this.ownerID = data.applyAsString("ownerID")
        this.creationDate = data.applyAsNumber("creationDate")
        this.lastAnswer = data.applyAsString("lastAnswer")
        this.affiliates = []
        data
            .applyAsList("affiliates")
            .map(d => d.toString())
            .forEach(a => this.affiliates.push(a))
    }
}