import {ClientModule} from "../../client";
import {toMillis} from "../../util/TimeUtil";
import {getChannel, getMessage} from "../../util/FetchUtil";
import {TextChannel} from "discord.js";
import {getInfoEmbed} from "../../util/EmbedUtil";

const request = require("request");

export class StreamModule implements ClientModule {
    lastTagged = false

    disable(): void {}

    buildOfflineEmbed() {
        return getInfoEmbed()
            .setDescription("Here you'll find status of __oop_778__ stream\nIf you want to be tagged whenever he goes live, go to <#811938811747369010> and take stream role.\nYou can find his streams at: https://www.twitch.tv/oop_778")
            .addField("Status", "<:offline:811941637285478410> Offline")
    }

    buildLiveEmbed(data) {
        return getInfoEmbed()
            .setDescription("Here you'll find status of __oop_778__ stream\nIf you want to be tagged whenever he goes live, go to <#811938811747369010> and take stream role.\nYou can find his streams at: https://www.twitch.tv/oop_778")
            .addField("Status", "<:online:811941596047212555> Live")
            .setThumbnail(data["thumbnail_url"].replace("{width}x{height}", "1920x1080"))
    }

    async update() {
        const data = await this.streamData()

        const channel = await getChannel("811980581813354518") as TextChannel
        const message = await getMessage("814867639239049256", channel)

        // If stream ended
        if (data["data"].length == 0) {
            await message.edit(this.buildOfflineEmbed().getAsEmbed())
            this.lastTagged = false

        } else {
            await message.edit(this.buildLiveEmbed(data["data"][0]).getAsEmbed())
            if (!this.lastTagged) {
                this.lastTagged = true
                channel.send(`<@&811939596756582410>`).then(message => message.delete())
            }
        }
    }

    load() {
        setInterval(async () => {
            await this.update()
        }, toMillis(60))
    }

    async streamData(): Promise<any> {
        return new Promise((resolve, reject) => {
            const options = {
                url: 'https://id.twitch.tv/oauth2/token',
                json:true,
                body: {
                    client_id: 'epfkapehh7j6xzr2l1h0y38z9012lq',
                    client_secret: 'hfyt5dnemxkzktd3p7abxch91whsnp',
                    grant_type: 'client_credentials'
                }
            };

            request.post(options, (_1, _2, body) => {
                const streamInfoOptions = {
                    url: 'https://api.twitch.tv/helix/streams/?user_login=oop_778',
                    method: 'GET',
                    headers:{
                        'Client-ID': 'epfkapehh7j6xzr2l1h0y38z9012lq',
                        'Authorization': 'Bearer ' + body.access_token
                    }
                }

                request.get(streamInfoOptions, (_3, _4, body) => {
                    resolve(JSON.parse(body))
                })
            });
        })
    }

    name(): string {
        return "stream";
    }
}
