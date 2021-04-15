import {WrappedClient} from "../client";
import {CustomEmbed} from "./CustomEmbed";
import {utils} from "./EmojiUtil";

export function getErrorEmbed(): CustomEmbed {
    return new CustomEmbed()
        .setTitle("Error", `${utils.get("error")} `)
        .setColor("#ff3333")
        .setFooter(process.env.BOT_FOOTER, WrappedClient.instance.user.avatarURL())
        .setTimestamp();
}

export function getSuccessEmbed(): CustomEmbed {
    return new CustomEmbed()
        .setTitle("Success", `${utils.get("yes")} `)
        .setColor("#00ff94")
        .setFooter(process.env.BOT_FOOTER, WrappedClient.instance.user.avatarURL())
        .setTimestamp()
}

export function getInfoEmbed(): CustomEmbed {
    return new CustomEmbed()
        .setColor("#36c2ff")
        .setFooter(process.env.BOT_FOOTER, WrappedClient.instance.user.avatarURL())
        .setTimestamp();
}

export function getNoPermissionEmbed(): CustomEmbed {
    return new CustomEmbed()
        .setColor("#ff3333")
        .setTitle("No permission", `${utils.get("no_permission")} `)
        .setFooter(process.env.BOT_FOOTER, WrappedClient.instance.user.avatarURL())
        .setTimestamp();
}

export function getWarningEmbed(): CustomEmbed {
    return new CustomEmbed()
        .setColor("#ffa700")
        .setFooter(process.env.BOT_FOOTER, WrappedClient.instance.user.avatarURL())
        .setTimestamp();
}
