import {ClientModule, WrappedClient} from "../../client";
import {ModuleSettings} from "../../moduleSettings";
import {SerializableObject, SerializedData} from "../../database";
import {toMillis} from "../../util/TimeUtil";
import {CategoryChannel, MessageReaction, ReactionCollector, TextChannel, User} from "discord.js";
import {compareObject} from "../../util/comparable";
import {TicketManager} from "./manager/ticketManager";
import {getMessage} from "../../util/FetchUtil";

// Module
export class Tickets implements ClientModule {
    settings: TicketsSettings
    ticketManager: TicketManager

    async disable() {
        await this.ticketManager.disable()
    }

    async load() {
        this.settings = (await WrappedClient.instance.moduleSettingsHolder
            .load(this, new TicketsSettings())) as TicketsSettings

        this.ticketManager = new TicketManager(this)
        if (this.settings.tempCategoryId !== undefined) {
            const tempCategory = WrappedClient.instance.guild.channels.cache.get(this.settings.tempCategoryId) as CategoryChannel
            if (tempCategory != undefined) {
                for (let value of tempCategory.children.values()) {
                    await value.delete()
                }
            }
        }

        await this.update()
        setInterval(async () => {
            await this.update()
        }, toMillis(10))
    }

    name(): string {
        return "Tickets";
    }

    async syncSettings() {
        await WrappedClient.instance.moduleSettingsHolder.get(this).save()
    }

    lastListener: ReactionCollector

    async update(): Promise<void> {
        // If no ticket list channel id is set, return
        if (this.settings.ticketListChannelID === undefined) return

        // Find channel from the id
        const ticketListChannel = Array.from(
            WrappedClient.instance.guild.channels.cache
                .values()
        )
            .find(channel => channel.id === this.settings.ticketListChannelID) as TextChannel
        if (ticketListChannel === undefined) return

        let message = await getMessage(this.settings.ticketMessageID, ticketListChannel)
        if (message === undefined) return

        this.lastListener?.stop()
        this.lastListener = message.createReactionCollector((react: MessageReaction, u: User) => !u.bot, {time: toMillis(20)})
        this.lastListener.on('collect', async (react, user) => {
            let ticketType = Array.from(this.settings.types.values())
                .find(type => type.emoji === react.emoji.toString() || type.emoji === react.emoji.id)

            if (ticketType == null) return
            react.users.remove(user)

            await this.ticketManager.create(ticketType, await ticketListChannel.guild.members.fetch(user.id))
        })
    }
}

export class TicketType extends SerializableObject {
    // Name of the ticket type
    name: string

    // Description of the ticket type
    description: string

    // Questions required for this ticket type
    questions: Question[]

    // Mention role id's
    supportRoleIds: string[]

    // Required roles ids
    requiredRoles: string[]

    // Emoji of the ticket type
    emoji?: string

    // Minified id
    minifiedId?: string

    constructor() {
        super();
        this.questions = []
        this.supportRoleIds = []
        this.requiredRoles = []
    }

    serialize(data: SerializedData) {
        data.write("name", this.name)
        data.write("supportRoleIds", this.supportRoleIds)
        data.write("questions", this.questions)
        data.write("minifiedId", this.minifiedId)
        data.write("emoji", this.emoji)
        data.write("description", this.description)
        data.write("requiredRoles", this.requiredRoles)
    }

    deserialize(data: SerializedData) {
        this.name = data.applyAsString("name")
        this.minifiedId = data.applyAsString("minifiedId", () => undefined)
        this.questions = []
        this.emoji = data.applyAsString("emoji", () => undefined)
        this.description = data.applyAsString("description", () => undefined)
        data
            .applyAsList("questions")
            .map(data => data.toSerializable(Question))
            .forEach(q => this.questions.push(q as Question))

        this.supportRoleIds = data.applyAsList("supportRoleIds", () => [])
            .map(sd => sd.toString())

        this.requiredRoles = data.applyAsList("requiredRoles", () => [])
            .map(sd => sd.toString())
    }

    removeQuestion(item: Question) {
        this.questions = this.questions
            .filter(question => question !== item)
    }

    clone(): TicketType {
        const data = new SerializedData()
        this.serialize(data)

        const newObject = new TicketType()
        newObject.deserialize(data)

        return newObject
    }

    isChanged(from: TicketType): boolean {
        return !compareObject(this, from)
    }

    isReady(): string[] {
        const description = []
        if (this.questions.length == 0)
            description.push("Missing at least single question")

        if (this.supportRoleIds.length == 0)
            description.push("Missing at least single support role id")

        if (this.minifiedId === undefined)
            description.push("Missing ticket type minified id")

        if (this.emoji === undefined)
            description.push("Missing ticket type emoji")

        if (this.description === undefined)
            description.push("Description is not provided!")

        return description
    }
}

export class Question extends SerializableObject {
    displayName: string
    question: string
    type: string

    serialize(data: SerializedData) {
        data.write("displayName", this.displayName)
        data.write("question", this.question)
        data.write("type", this.type)
    }

    deserialize(data: SerializedData) {
        this.type = data.applyAsString("type")
        this.question = data.applyAsString("question")
        this.displayName = data.applyAsString("displayName")
    }
}

export class TicketsSettings extends ModuleSettings {
    types: Map<string, TicketType>
    ticketListChannelID?: string
    ticketMessageID?: string
    tempCategoryId?: string
    answeredCategoryID?: string
    needsAnswerCategoryID?: string

    constructor() {
        super();
        this.types = new Map<string, TicketType>()
    }

    deserialize(data: SerializedData): void {
        data.applyAsMap("types")
            .forEach(pair => this.types.set(pair.key.toString(), pair.value.toSerializable(TicketType)))
        this.ticketListChannelID = data.applyAsString("ticketListChannelID", () => undefined)
        this.ticketMessageID = data.applyAsString("ticketMessageID", () => undefined)
        this.tempCategoryId = data.applyAsString("tempCategoryId", () => undefined)
        this.answeredCategoryID = data.applyAsString("answeredCategoryID", () => undefined)
        this.needsAnswerCategoryID = data.applyAsString("needsAnswerCategoryID", () => undefined)
    }

    serialize(data: SerializedData): void {
        data.write("types", this.types)
        data.write("ticketListChannelID", this.ticketListChannelID)
        data.write("ticketMessageID", this.ticketMessageID)
        data.write("tempCategoryId", this.tempCategoryId)
        data.write("answeredCategoryID", this.answeredCategoryID)
        data.write("needsAnswerCategoryID", this.needsAnswerCategoryID)
    }

    async addOrReplaceType(ticketType: TicketType) {
        this.types.set(ticketType.name, ticketType)
    }
}
