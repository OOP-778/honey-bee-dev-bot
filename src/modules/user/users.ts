import {ModelHolder, MongoModel, SerializableObject, SerializedData} from "../../database";
import {ClientModule, WrappedClient} from "../../client";
import {toMillis} from "../../util/TimeUtil";
import {getMember} from "../../util/FetchUtil";
import {memberContainsRoles} from "../../util/memberUtil";

export class Users extends ModelHolder<User> implements ClientModule {
    constructor() {
        super(
            User,
            "users",
            "id",
            1000 * 10,
            item => item.id
        );
    }

    load() {
        setInterval(async () => {
            const users = await this.getAll()
            for (let user of users) {
                if (!user.clockEnabled) continue
                if (!user.timezone) continue

                const member = await getMember(WrappedClient.instance.guild, user.id)
                if (!member) continue

                // Revert all old users if they don't have permission
                if (!member.hasPermission("ADMINISTRATOR")
                    && !memberContainsRoles(member, ["797526745002934302", "795570131107315763", "801813658900496394"])) {
                    user.clockEnabled = false
                    user.save()
                    member.setNickname(member.user.username)
                    continue
                }

                const date = Intl.DateTimeFormat("en-us", {
                        timeZone: user.timezone,
                        year: undefined,
                        month: undefined,
                        day: undefined,
                        hour: 'numeric',
                        minute: 'numeric',
                        second: undefined,
                        hour12: false
                    }
                )
                getMember(WrappedClient.instance.guild, user.id).then(member => member.setNickname(`${date.format(new Date())} » ${member.user.username}`))
            }
        }, toMillis(50))
    }

    disable() {
    }

    name(): string {
        return "Users"
    }
}

export class User extends MongoModel {
    id: string
    timezone?: string
    clockEnabled: boolean = false

    // Emails
    emails: string[]

    // Resources
    resources: ResourceData[]

    constructor(id: string = "Loading...") {
        super();
        this.id = id;
        this.emails = []
        this.resources = []
    }

    serialize(data: SerializedData) {
        data.write("id", this.id)
        if (this.timezone)
            data.write("timezone", this.timezone)
        data.write("clockEnabled", this.clockEnabled)
        data.write("emails", this.emails)
        data.write("resources", this.resources)
    }

    deserialize(data: SerializedData) {
        this.id = data.applyAsString("id")
        this.timezone = data.applyAsString("timezone", () => undefined)
        this.clockEnabled = data.applyAsBoolean("clockEnabled")
        this.emails = data
            .applyAsList("emails", () => [])
            .map(data => data.toString())

        this.resources = data
            .applyAsList("resources", () => [])
            .map(data => data.toSerializable(ResourceData))
    }
}

export class ResourceData extends SerializableObject {
    product: string
    date: string
    transactionID?: string

    serialize(data: SerializedData) {
        data.write("product", this.product)
        data.write("transactionID", this.transactionID)
        data.write("date", this.date)
    }

    deserialize(data: SerializedData) {
        this.product = data.applyAsString("product")
        this.transactionID = data.applyAsString("transactionID")
        this.date = data.applyAsString("date")
    }
}