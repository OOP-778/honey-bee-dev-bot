import {VTCommand} from "../../../util/commands/VTCommand";
import {WrappedClient} from "../../../client";
import {CommandInfo} from "../../../util/commands/CommandInfo";
import {ArgumentMap} from "../../../util/commands/ArgumentMap";
import {FormChoice, FormMessageAnswer, FormMultipleChoiceAnswer, FormPane} from "../../../util/pane/MessagePane";
import {Pair} from "../../../util/misc";
import {getChannel} from "../../../util/FetchUtil";
import {getInfoEmbed} from "../../../util/EmbedUtil";
import {TextChannel} from "discord.js";

export interface Topic {
    identifier: string
    emoji: string
    kind: string
}

const topics = [
    {
        identifier: "general",
        emoji: "⚙️",
        kind: "General"
    },
    {
        identifier: "prison",
        kind: "Prison",
        emoji: "<:prison:797567767996923924>"
    },
    {
        identifier: "bossesexpansion",
        kind: "BossesExpansion",
        emoji: "<:bossesexpansion:798437303692296193>"
    }
]

export class SuggestCmd extends VTCommand {
    label = "suggest"
    category = "misc"

    onlyInDMs = true

    run = async (client: WrappedClient, info: CommandInfo, argumentMap: ArgumentMap) => {
        const pane = new FormPane(info.channel, info.author, await info.fetchMember())

        const formChoices = topics
            .map(topic => {
                return {
                    emoji: topic.emoji,
                    explanation: topic.identifier,
                    onChoose: () => {
                        pane.answer(topic)
                        pane.send()
                    }
                } as FormChoice
            })

        pane.addQuestion({
            question: "What kind of suggestion you're making?",
            identifier: "topic",
            choices: formChoices
        } as FormMultipleChoiceAnswer)

        pane.addQuestion(
            {
                question: "What's your suggestion?",
                identifier: "suggestion",
                validator: async message => new Pair<any,string>(message.cleanContent, null)
            } as FormMessageAnswer
        )

        pane.onFinish = async () => {
            const topic = pane.answered.get<Topic>("topic")
            const suggestion = pane.answered.get<string>("suggestion")

            const channel = await getChannel("797528892108701796", info)
            const embed = getInfoEmbed()
                .addField("Type", topic.kind)
                .addField("Suggested By", `<@${info.author.id}>`)
                .addField("Suggestion", suggestion)
                .setColor(`#${Math.floor(Math.random()*16777215).toString(16)}`)
                .setThumbnail(info.author.avatarURL({dynamic: true}))
                .getAsEmbed();

            await (channel as TextChannel).send(embed)
        }

        await pane.send()
    }
}