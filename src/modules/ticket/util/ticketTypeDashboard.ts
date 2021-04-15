import {ConfirmPane, FormChoice, FormPane, PagedPane, Pane, PaneButton} from "../../../util/pane/MessagePane";
import {Question, Tickets, TicketType} from "../tickets";
import {CommandInfo} from "../../../util/commands/CommandInfo";
import {QuestionType, registeredQuestions} from "./questionTypes";
import {Pair} from "../../../util/misc";
import {WrappedClient} from "../../../client";
import {Message, Role} from "discord.js";
import {getSuccessEmbed} from "../../../util/EmbedUtil";
import {toMillis} from "../../../util/TimeUtil";
import {isEmoji} from "../../../util/EmojiUtil";

interface PaneComp {
    pane: () => Promise<Pane>,
    description: string
}

export function toPaneButton(paneComp: PaneComp) {
    return {
        identifier: paneComp.description,
        info: paneComp.description,
        onAction: async (onPane) => {
            await onPane.move(await paneComp.pane())
        }
    }
}

export class TicketTypeDashboard {
    ticketType: TicketType
    originalType: TicketType
    info: CommandInfo

    constructor(ticketType: TicketType, info: CommandInfo) {
        this.originalType = ticketType
        this.ticketType = ticketType.clone()
        this.info = info
    }

    async open() {
        const mainPane = new PagedPane<PaneButton>(this.info.channel, this.info.author, await this.info.fetchMember(), async () => {
            const buttons = []

            // To edit questions
            const questionsComp = await this.buildQuestionsPane()
            const questionPaneButton = toPaneButton(questionsComp)

            // Set minified id
            const setMinifiedComp = await this.askForSomething(
                "Set minified id",
                "What's the minified id gonna be?",
                async (message) => {
                    if (message.cleanContent.length > 5)
                        return new Pair(null, "The minified id should be less than 5 characters")

                    return new Pair(message.cleanContent, null)
                },
                async (pane, value) => {
                    this.ticketType.minifiedId = value
                    await pane.moveBack()
                }
            )
            const setMinifiedPaneButton = toPaneButton(setMinifiedComp)

            // Edit support role ids
            const supportRolesComp = await this.buildSupportRolesPane()
            const supportRolesButton = toPaneButton(supportRolesComp)

            // Set emoji
            const emojiComp = await this.askForSomething(
                "Set ticket emoji",
                "What's the ticket emoji gonna be?",
                async (message) => {
                    if (!isEmoji(message.content))
                        return new Pair(null, "The message doesn't contain emoji or the bot doesn't have access to the emoji")

                    return new Pair(message.content, null)
                },
                async (pane, value) => {
                    this.ticketType.emoji = value
                    await pane.moveBack()
                }
            )
            const emojiButton = toPaneButton(emojiComp)

            const descriptionComp = await this.askForSomething(
                "Set ticket description",
                "What's the ticket description gonna be?",
                async (message) => new Pair(message.content, null),
                async (pane, value) => {
                    this.ticketType.description = value
                    await pane.moveBack()
                }
            )
            const descriptionButton = toPaneButton(descriptionComp)

            // Add required roles id
            const requiredRolesConfig = toPaneButton(await this.buildRequiredRolesPane())

            // To save ticket type
            if (this.originalType.isChanged(this.ticketType)) {
                const saveButton = {
                    identifier: "save",
                    info: "Save",
                    emoji: "💾",
                    onAction: async (onPane) => {
                        Object.assign(this.originalType, this.ticketType)
                        await WrappedClient.instance
                            .module<Tickets>("tickets")
                            .settings
                            .addOrReplaceType(this.originalType)
                        await WrappedClient.instance
                            .module<Tickets>("tickets")
                            .syncSettings()

                        await onPane.onCancel()
                    }
                } as PaneButton
                buttons.push(saveButton)
            }

            buttons.push(questionPaneButton)
            buttons.push(supportRolesButton)
            buttons.push(setMinifiedPaneButton)
            buttons.push(emojiButton)
            buttons.push(descriptionButton)
            buttons.push(requiredRolesConfig)
            return buttons
        })

        mainPane.whenBuild = embed => {
            const description = this.ticketType.isReady()

            if (description.length == 0)
                description.push("Ticket type is ready for use!")

            embed.addField("👁️ Is ready?", description.join("\n"))
        }

        mainPane.buttonBuilder = item => item
        mainPane.title = `${this.ticketType.name} Dashboard`
        await mainPane.send()
    }

    async buildQuestionsPane(): Promise<PaneComp> {
        return {
            description: "Configure Questions",
            pane: async () => {
                const pane = new PagedPane<PaneComp>(this.info.channel, this.info.author, await this.info.fetchMember(), async () => {
                    const panes = []
                    panes.push(await this.buildQuestionAdd())

                    if (this.ticketType.questions.length > 0)
                        panes.push(await this.buildQuestionRemove())

                    return panes
                })
                pane.title = "Configure Questions"

                pane.buttonBuilder = (subPane: PaneComp) => {
                    return {
                        identifier: subPane.description,
                        info: subPane.description,
                        onAction: async (onPane, react) => {
                            await onPane.move(await subPane.pane())
                        }
                    }
                }
                return pane
            }
        }
    }

    async buildQuestionRemove(): Promise<PaneComp> {
        return {
            description: "Remove a question",
            pane: async () => {
                const pane = new PagedPane<Question>(this.info.channel, this.info.author, await this.info.fetchMember(), async () => this.ticketType.questions)
                pane.title = "Remove a question"
                pane.buttonBuilder = (item: Question) => {
                    return {
                        info: item.displayName,
                        onAction: async () => {
                            this.ticketType.removeQuestion(item)

                            if (this.ticketType.questions.length == 0)
                                return pane.moveBack()

                            await pane.send()
                        }
                    }
                }

                return pane
            }
        }
    }

    async buildQuestionAdd(): Promise<PaneComp> {
        const pane = new FormPane(this.info.channel, this.info.author, await this.info.fetchMember())

        const mapper: (QuestionType) => FormChoice = (type: QuestionType) => {
            return {
                emoji: type.emoji,
                explanation: type.type,
                onChoose: (react, onPane) => {
                    pane.answer(type.type)
                    onPane.send()
                }
            }
        }

        pane.addQuestion(
            {
                identifier: "type",
                question: "What type of question you want to create?",
                choices: registeredQuestions
                    .values()
                    .map(value => mapper(value)),
            }
        )

        pane.addQuestion({
            identifier: "question",
            question: "What's the question gonna be?",
            validator: async (message) => {
                return new Pair(message.cleanContent, null)
            }
        })

        pane.addQuestion({
            identifier: "display name",
            question: "What the display name of the question will be?",
            validator: async (message) => {
                return new Pair(message.cleanContent, null)
            }
        })

        pane.onFinish = async pane => {
            const answers = pane.answered
            const confirmPane = new ConfirmPane(
                this.info.channel, this.info.author, await this.info.fetchMember(),
                "creation of the question",
                embed => {
                    embed.addField(
                        "Question",
                        answers.entries()
                            .map(value => `${value.key} = ${value.value}`)
                            .join("\n")
                    )
                },
                async answer => {
                    if (answer == 'yes') {
                        const question = new Question()
                        question.question = answers.get<string>("question")
                        question.type = answers.get<string>("type")
                        question.displayName = answers.get<string>("display name")
                        this.ticketType.questions.push(question)
                    }
                    await pane.moveBack()
                }
            )
            await confirmPane.send()
        }

        return {
            description: "Add new question",
            pane: async () => pane
        }
    }

    async buildRequiredRolesPane(): Promise<PaneComp> {
        return {
            description: "Configure Required Roles",
            pane: async () => {
                const pane = new PagedPane<PaneButton>(this.info.channel, this.info.author, await this.info.fetchMember(), async () => {
                    const buttons = []
                    if (this.ticketType.requiredRoles.length != 0)
                        buttons.push(toPaneButton(await this.buildRequiredRoleAdd()))

                    buttons.push(toPaneButton(await this.buildRequiredRoleAdd()))
                    return buttons
                })
                pane.buttonBuilder = item => item

                pane.title = "Configure Required Roles"
                pane.whenBuild = embed => {
                    embed.description = "Required roles are requirements for the ticket to open.\n\n" + embed.description
                }

                return pane
            }
        }
    }

    async buildRequiredRoleRemove(): Promise<PaneComp> {
        return {
            description: "Remove a required role",
            pane: async () => {
                const pane = new PagedPane<PaneButton>(this.info.channel, this.info.author, await this.info.fetchMember(), async () => {
                    const buttons = []
                    for (let roleId of this.ticketType.requiredRoles) {
                        const role = this.info.guild.roles.cache.get(roleId);
                        buttons.push({
                            identifier: role.name,
                            info: role.name,
                            onAction: async () => {
                                this.ticketType.requiredRoles = this.ticketType.requiredRoles
                                    .filter(roleId2 => roleId2 != role.id)

                                if (this.ticketType.requiredRoles.length == 0)
                                    return pane.moveBack()

                                await pane.send()
                            }
                        })
                    }
                    return buttons
                })
                pane.buttonBuilder = item => item
                pane.title = "Remove a required role"

                return pane
            }
        }
    }

    async buildRequiredRoleAdd(): Promise<PaneComp> {
        return {
            description: "Add a new required role",
            pane: async () => {
                const pane = new FormPane(this.info.channel, this.info.author, await this.info.fetchMember())
                pane.addQuestion({
                    identifier: "roleIds",
                    question: "Send a message with roles mentioned to add to the required roles",
                    validator: async (message) => {
                        const roles = Array.from(message.mentions.roles.values())
                        if (roles.length == 0) return new Pair(null, "Failed to find any mentioned roles in the message")

                        return new Pair(roles, null)
                    }
                })

                pane.onFinish = () => {
                    let roles = pane.answered.get<Array<Role>>("roleIds")
                    roles = roles.filter(role => !this.ticketType.requiredRoles.includes(role.id))

                    this.ticketType.requiredRoles.push(...roles.map(role => role.id))

                    this.info.channel.send(
                        getSuccessEmbed()
                            .setDescription(`Added ${roles.map(role => role.name).join(", ")}`)
                            .getAsEmbed()
                    ).then(message => message.delete({timeout: toMillis(4)}))
                    pane.moveBack()
                }
                return pane
            }
        }
    }

    async buildSupportRolesPane(): Promise<PaneComp> {
        return {
            description: "Configure Support Roles",
            pane: async () => {
                const pane = new PagedPane<PaneButton>(this.info.channel, this.info.author, await this.info.fetchMember(), async () => {
                    const buttons = []
                    if (this.ticketType.supportRoleIds.length != 0)
                        buttons.push(toPaneButton(await this.buildSupportRoleRemove()))

                    buttons.push(toPaneButton(await this.buildSupportRoleAdd()))
                    return buttons
                })
                pane.buttonBuilder = item => item

                pane.title = "Configure Support Roles"
                pane.whenBuild = embed => {
                    embed.description = "Support roles are used for who's gonna be handling the ticket and also who will be tagged.\n\n" + embed.description
                }

                return pane
            }
        }
    }

    async buildSupportRoleRemove(): Promise<PaneComp> {
        return {
            description: "Remove support roles",
            pane: async () => {
                const pane = new PagedPane<PaneButton>(this.info.channel, this.info.author, await this.info.fetchMember(), async () => {
                    const buttons = []
                    for (let roleId of this.ticketType.supportRoleIds) {
                        const role = this.info.guild.roles.cache.get(roleId);
                        buttons.push({
                            identifier: role.name,
                            info: role.name,
                            onAction: async () => {
                                this.ticketType.supportRoleIds = this.ticketType.supportRoleIds
                                    .filter(roleId2 => roleId2 != role.id)

                                if (this.ticketType.supportRoleIds.length == 0)
                                    return pane.moveBack()

                                await pane.send()
                            }
                        })
                    }
                    return buttons
                })
                pane.buttonBuilder = item => item
                pane.title = "Remove a support role"

                return pane
            }
        }
    }

    async buildSupportRoleAdd(): Promise<PaneComp> {
        return {
            description: "Add new support role",
            pane: async () => {
                const pane = new FormPane(this.info.channel, this.info.author, await this.info.fetchMember())
                pane.addQuestion({
                    identifier: "roleIds",
                    question: "Send a message with roles mentioned to add to support roles.",
                    validator: async (message) => {
                        const roles = Array.from(message.mentions.roles.values())
                        if (roles.length == 0) return new Pair(null, "Failed to find any mentioned roles in the message")

                        return new Pair(roles, null)
                    }
                })

                pane.onFinish = () => {
                    let roles = pane.answered.get<Array<Role>>("roleIds")
                    roles = roles.filter(role => !this.ticketType.supportRoleIds.includes(role.id))

                    this.ticketType.supportRoleIds.push(...roles.map(role => role.id))

                    this.info.channel.send(
                        getSuccessEmbed()
                            .setDescription(`Added ${roles.map(role => role.name).join(", ")}`)
                            .getAsEmbed()
                    ).then(message => message.delete({timeout: toMillis(4)}))
                    pane.moveBack()
                }
                return pane
            }
        }
    }

    async askForSomething(description: string, question: string, validator: (message: Message) => Promise<Pair<any, string>>, onFinish: (pane: FormPane, value: any) => Promise<void>): Promise<PaneComp> {
        return {
            description: description,
            pane: async () => {
                const pane = new FormPane(this.info.channel, this.info.author, await this.info.fetchMember())
                pane.addQuestion({
                    identifier: "value",
                    question: question,
                    validator: validator
                })

                pane.onFinish = () => {
                    const value = pane.answered.get<any>("value")
                    onFinish(pane, value)
                }
                return pane
            }
        }
    }
}