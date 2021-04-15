import {FormMessageAnswer, FormPane, PagedPane, Pane, PaneButton} from "../../../util/pane/MessagePane";
import {User} from "../users";
import {GuildMember, TextChannel} from "discord.js";
import {generateId, Pair} from "../../../util/misc";
import {WrappedClient} from "../../../client";
import {getErrorEmbed, getInfoEmbed} from "../../../util/EmbedUtil";
import {toMillis} from "../../../util/TimeUtil";

interface PaneComp {
    pane: () => Promise<Pane>,
    description: string
}

function toPaneButton(paneComp: PaneComp) {
    return {
        identifier: paneComp.description,
        info: paneComp.description,
        onAction: async (onPane) => {
            await onPane.move(await paneComp.pane())
        }
    }
}

export class UserDashboard {
    user: User
    member: GuildMember
    channel: TextChannel

    constructor(member: GuildMember, user: User, channel: TextChannel) {
        this.user = user
        this.member = member
        this.channel = channel
    }

    /*
    Buttons:
    - Edit emails
    - Get resources form Spigotmc/market
    - Affiliates
    */
    async open() {
        const mainPane = new PagedPane<PaneButton>(this.channel, this.member.user, this.member, async () => {
            return [
                toPaneButton(await this.getEmailsPane()),
                {
                    emoji: '⚙️',
                    info: "Update your purchases",
                    onAction: async () => {
                        await this.updatePurchases()
                        await mainPane.send()
                    }
                } as PaneButton
            ]
        })

        mainPane.buttonBuilder = item => item
        mainPane.title = "Your Dashboard"

        await mainPane.send()
    }

    async updatePurchases() {
        const updatingMessage = await this.channel.send(
            getInfoEmbed()
                .setDescription(`Updating your purchases...`)
                .getAsEmbed()
        )

        await WrappedClient.instance.verification.updatePurchases(this.user)
        updatingMessage.delete()

        if (this.user.resources.length == 0) {
            this.channel.send(
                getErrorEmbed()
                    .setDescription(`You don't have purchased any of the products. If you believe it's not true, open an verification ticket.`)
                    .getAsEmbed()
            ).then(message => message.delete({timeout: 10}))
            return
        }

        await this.channel.send(
            getInfoEmbed()
                .setDescription(`Your purchases are: ${this.user.resources.map(r => r.product).join(", ")}`)
                .getAsEmbed()
        )
    }

    // Emails pane
    // - Link new email
    // - Remove an email
    async getEmailsPane(): Promise<PaneComp> {
        return {
            description: "Edit emails",
            pane: async () => {
                const pane = new PagedPane<PaneButton>(this.channel, this.member.user, this.member, async () => {
                    const panes = [
                        toPaneButton(await this.getLinkNewEmailPane()),
                    ]

                    if (this.user.emails.length != 0)
                        panes.push(toPaneButton(await this.getRemoveAnEmail()))

                    return panes
                })

                pane.buttonBuilder = item => item
                pane.title = "Edit emails"

                return pane
            }
        }
    }

    // async getResourcesFromMarket(): Promise<PaneComp> {
    //     return {}
    // }

    async getRemoveAnEmail(): Promise<PaneComp> {
        return {
            description: "Remove emails",
            pane: async () => {
                const pane = new PagedPane<string>(this.channel, this.member.user, this.member, async () => this.user.emails)
                pane.title = "Remove emails"
                pane.buttonBuilder = (item: string) => {
                    return {
                        info: item,
                        onAction: async () => {
                            this.user.emails = this.user.emails.filter(email => email !== item)

                            await this.user.save()

                            if (this.user.emails.length == 0)
                                return pane.moveBack()

                            await pane.send()
                        }
                    }
                }

                return pane
            }
        }
    }

    async getLinkNewEmailPane(): Promise<PaneComp> {
        return {
            description: "Link new email",
            pane: async () => {
                const pane = new FormPane(this.channel, this.member.user, this.member)

                // Questions:
                // What's the email?

                pane.addQuestion(
                    {
                        identifier: "email",
                        question: "What's the email?",
                        validator: async (message) => {
                            if (this.user.emails.find(it => it === message.cleanContent))
                                return new Pair(null, "You already have linked this email!")

                            const regex = new RegExp(
                                "(?:[a-z0-9!#$%&'*+\\/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+\\/=?^_`{|}~-]+)*|\"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\\\[\x01-\x09\x0b\x0c\x0e-\x7f])*\")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\\])",
                                "gm"
                            )

                            if (!regex.test(message.cleanContent))
                                return new Pair(null, "Invalid Email Address")

                            return new Pair(message.cleanContent.toLowerCase(), null)
                        }
                    } as FormMessageAnswer
                )

                pane.onFinish = async () => {
                    const email = pane.answered.get<string>("email")
                    const code = generateId(5)

                    let message = await this.channel.send(getInfoEmbed()
                        .setTitle("Sending email...")
                        .setDescription(`Please check '${email}' for verification code from 'info@honeybeedev.com'. It may be in your trash inbox.`)
                        .getAsEmbed())
                    await WrappedClient.instance.verification.sendCode(email, code)
                    await message.edit(getInfoEmbed()
                        .setTitle("Email sent!")
                        .setDescription(`Please check '${email}' for verification code from 'info@honeybeedev.com'. It may be in your trash inbox.`)
                        .getAsEmbed())

                    await pane.onCancel()
                    pane.questions = []
                    pane.questions.push(
                        {
                            question: "What's the code that you received in email?",
                            identifier: "code",
                            validator: async (message) => {
                                const validCode = message.cleanContent === code
                                if (!validCode)
                                    return new Pair(null, "Invalid code")
                                else
                                    return new Pair(validCode, null)
                            }
                        } as FormMessageAnswer
                    )

                    pane.onFinish = async () => {
                        await message.delete()
                        message = await this.channel.send(getInfoEmbed()
                            .setTitle("Email verification succeeded!")
                            .setDescription(`Your email '${email}' has been verified!`)
                            .getAsEmbed())

                        message.delete({timeout: toMillis(3)})
                        this.user.emails.push(email)
                        await this.user.save()
                        await pane.moveBack()
                    }

                    await pane.send()
                }

                return pane
            }
        }
    }
}