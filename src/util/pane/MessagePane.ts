import {
    DMChannel,
    GuildMember,
    Message,
    MessageCollector,
    MessageReaction,
    NewsChannel,
    ReactionCollector,
    TextChannel,
    User
} from "discord.js";
import {getErrorEmbed, getInfoEmbed} from "../EmbedUtil";
import {numbers, numberToEmoji, utils} from "../EmojiUtil";
import {CustomEmbed} from "../CustomEmbed";
import {isTypeOfInterface, Pair, safeDelete} from "../misc";
import {EnhancedMap} from "../EnhancedMap";
import {toMillis} from "../TimeUtil";

export abstract class Pane {
    channel: TextChannel | DMChannel | NewsChannel;
    user: User
    member: GuildMember
    mode: "dm" | "guild"
    parent?: Pane
    message?: Message
    emojiToButton: Map<string, PaneButton>
    stopped: boolean = false

    allowParentBack: boolean = true

    reactionCollector?: ReactionCollector = undefined
    messageCollector?: MessageCollector = undefined

    parentBackEmoji: string = "⏮️"
    cancelEmoji: string = "⛔"

    whenBuild: (embed: CustomEmbed) => void

    whenCancel: () => void

    constructor(channel: TextChannel | DMChannel | NewsChannel, user: User, member: GuildMember) {
        this.channel = channel
        this.user = user
        this.member = member
        this.mode = channel.type == 'dm' ? "dm" : "guild"
        this.emojiToButton = new Map<string, PaneButton>()
    }

    async onReaction(reaction: MessageReaction) {
        if (reaction.emoji.toString() == this.parentBackEmoji) {
            this.stopped = true
            return this.moveBack()
        }

        if (reaction.emoji.toString() == this.cancelEmoji) {
            await this.onCancel()
            this.stopped = true

            if (this.whenCancel)
                this.whenCancel()
        }
    }

    abstract onMessage(message: Message)

    async onTimeOut() {}

    abstract send()

    onBuild(embed: CustomEmbed) {
        this.whenBuild?.(embed)

        embed.addField(utils.get("book") + " Information", `
        In order to cancel click ${this.cancelEmoji}
        ${!(this.parent != null && this.allowParentBack) ? "" : `In order to go back to previous pane, click on ${this.parentBackEmoji}`}
        `)

        embed.addField(utils.get("warning") + "Warning", "Please wait till all options are loaded, otherwise the actions won't work")
    }

    async onCancel() {
        this.reset()
        await safeDelete(this.message)
        this.message = null
    }

    async onSend() {
        if (this.parent != null && this.allowParentBack)
            await this.message.react(this.parentBackEmoji)

        await this.message.react(this.cancelEmoji)
    }

    async applyOn(message: Message, timeout: number) {
        this.reset()
        this.message = message
        this.reactionCollector = this.message.createReactionCollector((r: MessageReaction, u: User) => u.id == this.user.id, {time: timeout})
        this.messageCollector = this.channel.createMessageCollector((m: Message) => m.author.id == this.user.id, {time: timeout})

        this.reactionCollector.on('end', ((collected, reason) => {
            if (reason == 'timeout')
                this.applyOn(message, timeout)
        }))

        this.messageCollector.on('end', ((collected, reason) => {
            if (reason == 'timeout')
                this.onTimeOut()
        }))

        this.reactionCollector.on('collect', (collected) => {
            this.onReaction(collected)
        })

        this.messageCollector.on('collect', (collected) => {
            this.onMessage(collected)
        })
    }

    reset() {
        this.messageCollector?.stop()
        this.reactionCollector?.stop()
    }

    async move(pane: Pane) {
        await this.onCancel()
        pane.parent = this
        pane.stopped = false

        await pane.send()
    }

    async moveBack() {
        if (this.parent == null) return
        await this.onCancel()

        this.parent.stopped = false
        this.onMoveBack()
        await this.parent.send()
    }

    onMoveBack() {

    }
}

export interface PaneButton {
    emoji?: string
    info?: string
    onAction: (pane: Pane, react: MessageReaction) => Promise<any>
}

export abstract class MessagePane extends Pane {
    identifier: string
}

/*
██████╗  █████╗  ██████╗ ███████╗██████╗
██╔══██╗██╔══██╗██╔════╝ ██╔════╝██╔══██╗
██████╔╝███████║██║  ███╗█████╗  ██║  ██║
██╔═══╝ ██╔══██║██║   ██║██╔══╝  ██║  ██║
██║     ██║  ██║╚██████╔╝███████╗██████╔╝
╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═════╝
*/
export class PagedPane<T> extends MessagePane {
    items: () => Promise<T[]>
    currentPage: number = 1
    pages: number
    itemsPerPage: number = 5
    title: string

    previousPageEmoji: string = "⏮️"
    nextPageEmoji: string = "⏭️"

    buttonBuilder: (T) => PaneButton

    constructor(channel: TextChannel | DMChannel | NewsChannel, user: User, member: GuildMember, items: () => Promise<T[]>) {
        super(channel, user, member);
        this.items = items
    }

    reset() {
        super.reset();
        this.currentPage = 1
    }

    async onMessage(message: Message): Promise<any> {
        return Promise.resolve(undefined);
    }

    async onReaction(reaction: MessageReaction): Promise<any> {
        super.onReaction(reaction)
        if (reaction.emoji.toString() == this.nextPageEmoji) {
            this.currentPage += 1
            return this.send()
        }

        if (reaction.emoji.toString() == this.previousPageEmoji) {
            this.currentPage -= 1
            return this.send()
        }

        this.emojiToButton.get(reaction.emoji.toString())?.onAction(this, reaction)
    }

    async onTimeOut(): Promise<any> {
        console.log("timeout")
        return Promise.resolve(undefined);
    }

    async send(): Promise<any> {
        if (this.stopped) return

        const items = await this.items()

        this.emojiToButton.clear()
        this.itemsPerPage = Math.min(this.itemsPerPage, 5)

        if (this.itemsPerPage > items.length)
            this.pages = 1
        else
            this.pages = Math.ceil(Number((items.length / this.itemsPerPage).toFixed(2)))

        const startIndex = this.currentPage == 1 ? 0 : (this.currentPage * this.itemsPerPage) - this.itemsPerPage
        const endIndex = startIndex + (Math.min(this.itemsPerPage, items.length))

        const displaying = items.slice(startIndex, endIndex)
        const toAddEmojis = []

        let embedBuilder = getInfoEmbed()
            .setTitle(this.replacePlaceholders(this.title))
            .setDescription(
                displaying
                    .map((value, index) => {
                        const button = this.buttonBuilder(value)
                        const emoji = button.emoji ? button.emoji : numbers.get(index + 1)
                        toAddEmojis.push(emoji)

                        this.emojiToButton.set(emoji, button)
                        return `${emoji} - ${button.info}`
                    })
                    .join("\n")
            )
        this.onBuild(embedBuilder)

        if (this.message != undefined) {
            if (this.mode === "dm") {
                await safeDelete(this.message)
                this.message = await this.channel.send(embedBuilder.getAsEmbed())

            } else {
                await this.message.edit(embedBuilder.getAsEmbed())
                await this.message.reactions.removeAll()
            }
        } else
            this.message = await this.channel.send(embedBuilder.getAsEmbed())

        await this.onSend()

        if (this.currentPage != 1)
            await this.message.react(this.previousPageEmoji)

        for (let toAddEmoji of toAddEmojis)
            await this.message.react(toAddEmoji)

        if (this.pages != 1 && this.pages != this.currentPage)
            await this.message.react(this.nextPageEmoji)

        await this.applyOn(this.message, toMillis(60 * 20))
    }

    private replacePlaceholders(input: string): string {
        input = input.replace("{currentPage}", this.currentPage + "")
        input = input.replace("{pagesAvailable}", this.pages + "")
        return input
    }
}

/*
███████╗ ██████╗ ██████╗ ███╗   ███╗
██╔════╝██╔═══██╗██╔══██╗████╗ ████║
█████╗  ██║   ██║██████╔╝██╔████╔██║
██╔══╝  ██║   ██║██╔══██╗██║╚██╔╝██║
██║     ╚██████╔╝██║  ██║██║ ╚═╝ ██║
╚═╝      ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝
*/
export class FormPane extends MessagePane {
    questions: FormQuestion[]
    currentQuestion = 0

    answered: EnhancedMap<any>
    waitingForAnswer: boolean = false

    onFinish: (pane: FormPane) => void

    constructor(channel: TextChannel | DMChannel | NewsChannel, user: User, member: GuildMember) {
        super(channel, user, member);
        this.answered = new EnhancedMap<string>()

        this.questions = []
        this.allowParentBack = false
    }

    reset() {
        super.reset();
    }

    onMoveBack() {
        this.currentQuestion = 0
        this.answered.clear()
    }

    addQuestion(question: FormMultipleChoiceAnswer | FormMessageAnswer): FormPane{
        this.questions.push(question)
        return this
    }

    async onReaction(reaction: MessageReaction): Promise<void> {
        super.onReaction(reaction);
        if (!this.waitingForAnswer || this.stopped) return Promise.resolve()

        const possibleButton = this.emojiToButton.get(reaction.emoji.toString())
        if (possibleButton == undefined) return

        const lastQuestion = this.currentQuestion
        await possibleButton.onAction(this, reaction)

        if ((this.questions.length - 1) == lastQuestion) {
            await this.onFinish?.(this)
            return await this.onCancel()
        }

        this.waitingForAnswer = false
    }

    async answer(object: any) {
        const formQuestion = this.questions[this.currentQuestion];
        this.answered.set(formQuestion.identifier, object)
        this.currentQuestion++
    }

    async onMessage(message: Message) {
        if (!this.waitingForAnswer) return
        const question = this.questions[this.currentQuestion]

        if (this.mode == 'guild')
            safeDelete(message, 1000 * 10)

        // We got an message question
        if (isTypeOfInterface(question, "validator")) {
            const validated = await (question as FormMessageAnswer).validator(message, this)
            if (validated.value != undefined) {
                const errorMessage = await message.channel.send(getErrorEmbed()
                    .setDescription(validated.value)
                    .getAsEmbed())

                return safeDelete(errorMessage, 1000 * 10)
            }

            const lastQuestion = this.currentQuestion
            await this.answer(validated.key)

            if ((this.questions.length - 1) == lastQuestion) {
                this.onFinish?.(this)
                return await this.onCancel()
            }

            this.waitingForAnswer = false
            await this.send()
        }
    }

    async send() {
        if (this.stopped) return

        const number = numberToEmoji(this.currentQuestion+1)
        let question = this.questions[this.currentQuestion]

        if (question == null) {
            this.currentQuestion = 0
            question = this.questions[0]
        }

        const isChoices = isTypeOfInterface(question, "choices", false)

        const embedBuilder = getInfoEmbed()
            .setTitle(`${number} - ${question.question}`)

        if (question.description)
            embedBuilder.setDescription(question.description)

        if (isChoices) {
            embedBuilder.addField(
                "ℹ️ Choices",
                `${
                    (question as FormMultipleChoiceAnswer).choices
                        .map(choice => `  ${choice.explanation} ${choice.emoji}`)
                        .join("\n")
                }`
            )
        }

        await this.onBuild(embedBuilder)

        if (this.message != undefined) {
            if (this.mode === "dm") {
                safeDelete(this.message)
                this.message = await this.channel.send(embedBuilder.getAsEmbed())

            } else {
                await this.message.edit(embedBuilder.getAsEmbed())
                await this.message.reactions.removeAll()
            }
        } else
            this.message = await this.channel.send(embedBuilder.getAsEmbed())

        this.waitingForAnswer = true
        await this.onSend()

        // If question is multi choice answer
        if (isChoices) {
            for (let choice of (question as FormMultipleChoiceAnswer).choices) {
                await this.message.react(choice.emoji)
                this.emojiToButton.set(choice.emoji, {
                    emoji: choice.emoji,
                    onAction: async (pane, react) => {
                        choice.onChoose(react, this)
                    }
                })
            }
        }

        await this.applyOn(this.message, toMillis(60 * 20))
    }
}

export interface FormQuestion {
    isMessage?: boolean
    identifier: string
    question: string
    description?: string
}

export interface FormMessageAnswer extends FormQuestion {
    validator: (message: Message, pane: FormPane) => Promise<Pair<any, string>>
}

export interface FormMultipleChoiceAnswer extends FormQuestion {
    choices: FormChoice[]
}

export interface FormChoice {
    emoji: string
    explanation: string
    onChoose: (react: MessageReaction, pane: FormPane) => any
}


export class ConfirmPane extends FormPane {
    onBuild(embed: CustomEmbed) {
        super.onBuild(embed);
        this.allowParentBack = false
    }

    constructor(channel: TextChannel | DMChannel | NewsChannel, user: User, member: GuildMember, action: string, onBuild: (builder: CustomEmbed) => void, onAnswer: (answer: "yes" | "no") => void) {
        super(channel, user, member);
        this.whenBuild = onBuild

        this.addQuestion({
            identifier: "yesNo",
            question: "Confirm",
            description: `Do you want to confirm ${action}?`,
            choices: [
                {
                    emoji: utils.get("yes"),
                    explanation: "Yes",
                    onChoose: (async (react, pane) => {
                        onAnswer("yes")
                    })
                },
                {
                    emoji: utils.get("no"),
                    explanation: "No",
                    onChoose: (async (react, pane) => {
                        onAnswer("no")
                    })
                }
            ]
        })
    }
}