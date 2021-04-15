import {VTCommand} from "../../../util/commands/VTCommand";
import {WrappedClient} from "../../../client";
import {CommandInfo} from "../../../util/commands/CommandInfo";
import {ArgumentMap} from "../../../util/commands/ArgumentMap";
import {StringArgument} from "../../../util/commands/arguments/StringArgument";
import {getErrorEmbed, getInfoEmbed, getSuccessEmbed} from "../../../util/EmbedUtil";
import {modifyMessageSafely} from "../../../util/messageUtil";
import {toMillis} from "../../../util/TimeUtil";
import {Message, MessageEmbed} from "discord.js";
import {getProducts} from "../../../products";
import {MessageArgument} from "../../../util/commands/arguments/MessageArgument";
const request = require("request");

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
    description = "Administration command"

    constructor() {
        super();
        this.registerSubcommand(new SendJsonEmbed())
        this.registerSubcommand(new AddPurchase())
        this.registerSubcommand(new ConvertMessageToJson())
    }
}

class SendJsonEmbed extends VTCommand {
    label: string = "sendJsonEmbed"
    type = "sub"

    arguments = [
        new StringArgument()
            .setIdentifier("url")
            .setDescription("An url of json raw bin!")
    ]

    run = async (client: WrappedClient, info: CommandInfo, argumentMap: ArgumentMap) => {
        const url = argumentMap.get<string>("url")
        try {
            request(url, {json: true}, async (err, res, body) => {
                await info.message.delete()
                await info.channel.send(body.content, new MessageEmbed(body.embed))
            })
        } catch (e) {
            info.channel
                .send(getErrorEmbed()
                    .setDescription(`Invalid URL or Json!`).getAsEmbed())
                .then(message => modifyMessageSafely(message, () => message.delete(), toMillis(4)))
            return
        }
    }
}

class AddPurchase extends VTCommand {
    label = "addPurchase"
    type = "sub"

    arguments = [
        new StringArgument()
            .setLimit(1)
            .setIdentifier("email")
            .setDescription("Email of the user"),
        new StringArgument()
            .setLimit(1)
            .setIdentifier("product")
            .setDescription(`Products: ${getProducts().map(p => p.name).join(", ")}`)
    ]

    run = async (client: WrappedClient, info: CommandInfo, argumentMap: ArgumentMap) => {
        const email = argumentMap.get<string>("email")
        const product = argumentMap.get<string>("product")

        if (getProducts().find(p => p.name.toLowerCase() === product.toLowerCase() == undefined)) {
            info.channel
                .send(getErrorEmbed()
                    .setDescription(`Invalid Product... Available: ${getProducts().map(p => p.name).join(", ")}`).getAsEmbed())
                .then(message => modifyMessageSafely(message, () => message.delete(), toMillis(4)))
            return
        }

        await WrappedClient.instance.verification.insertPurchase(email, product)
        info.channel
            .send(getSuccessEmbed()
                .setDescription(`Successfully added ${product} to users email: ${email}`).getAsEmbed())
            .then(message => modifyMessageSafely(message, () => message.delete(), toMillis(4)))
    }
}

class ConvertMessageToJson extends VTCommand {
    label = "convertMessage"
    type = "sub"

    arguments = [
        new MessageArgument()
    ]

    run = async (client: WrappedClient, info: CommandInfo, argumentMap: ArgumentMap) => {
        const message = argumentMap.get<Message>("message")
        await message.fetch(true)

        console.log(message["content"])
        request.post(
            "https://paste.honeybeedev.com/documents",
            {
                body: JSON.stringify({
                    "content": message.content,
                    "embeds": message["embeds"]
                }, null, 2)
            },
            ((error, response) => {
                if (error) {
                    return console.log(error)
                }

                const url = "https://paste.honeybeedev.com/" + JSON.parse(response.body)["key"]
                info.channel
                    .send(getSuccessEmbed()
                        .setDescription(`You can find json of the message at: ${url}`).getAsEmbed())
                    .then(message => modifyMessageSafely(message, () => message.delete(), toMillis(100)))
            })
        )
    }
}
