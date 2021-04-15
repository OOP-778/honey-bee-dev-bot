import {ColorResolvable, EmbedFieldData, MessageEmbed} from "discord.js";

export class CustomEmbed {

    title: string;
    titlePrefix: string;
    color: ColorResolvable;
    description: string;

    thumbnail: string;
    image: string;

    timestamp: number | Date;
    fields: EmbedFieldData[];
    footer: string;
    footerUrl: string;

    constructor() {
        this.fields = [];
    }

    static fromJson(json: any): CustomEmbed {
        const embed = new CustomEmbed();
        embed.setTitle(json["title"]);
        embed.setDescription(json["description"]);
        embed.setColor(json["color"]);
        embed.setFooter(json["footer"], json["footer-url"]);
        embed.setThumbnail(json["thumbnail"]);
        embed.setImage(json["image"]);
        return embed;
    }

    setTitle(paramString: string, prefix?: string): CustomEmbed {
        this.title = paramString;
        if (prefix) this.titlePrefix = prefix;
        return this;
    }

    setColor(paramColor: ColorResolvable): CustomEmbed {
        this.color = paramColor;
        return this;
    }

    setDescription(paramString: string): CustomEmbed {
        this.description = paramString;
        return this;
    }

    setThumbnail(paramString: string): CustomEmbed {
        this.thumbnail = paramString;
        return this;
    }

    setImage(paramString: string): CustomEmbed {
        this.image = paramString;
        return this;
    }

    setTimestamp(paramTime?: number | Date): CustomEmbed {
        this.timestamp = paramTime;
        return this;
    }

    setFooter(paramString: string, paramUrl?: string): CustomEmbed {
        this.footer = paramString;
        this.footerUrl = paramUrl;
        return this;
    }

    addField(paramName: string, paramValue: string, inline?: true): CustomEmbed {
        this.fields.push({name: paramName, value: paramValue, inline: inline});
        return this;
    }

    getAsEmbed(): MessageEmbed {
        const embed = new MessageEmbed();
        if (this.title || this.titlePrefix) embed.setTitle(`${this.titlePrefix || ""}${this.title || ""}`);
        if (this.color) embed.setColor(this.color);
        if (this.description) embed.setDescription(this.description);
        if (this.thumbnail) embed.setThumbnail(this.thumbnail);
        if (this.image) embed.setImage(this.image);
        if (this.footer || this.footerUrl) embed.setFooter(this.footer, this.footerUrl);
        if (this.timestamp) embed.setTimestamp(this.timestamp);
        if (this.fields.length > 0) embed.addFields(this.fields);
        return embed;
    }

    toJson(): any {
        const json = {};
        if (this.title) json["title"] = this.title;
        if (this.description) json["description"] = this.description;
        if (this.color) json["color"] = this.color;
        if (this.footer) json["footer"] = this.footer;
        if (this.footerUrl) json["footer-url"] = this.footerUrl;
        if (this.thumbnail) json["thumbnail"] = this.thumbnail;
        if (this.image) json["image"] = this.image;
        return json;
    }
}