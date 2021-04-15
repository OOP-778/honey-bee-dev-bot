import {GuildMember} from "discord.js";

export function memberContainsRoles(member: GuildMember, roles: string[], any: boolean = true): boolean {
    const found = Array
        .from(member.roles.cache.values())
        .filter(role => roles.find(role2 => role2 === role.name || role2 === role.id) != undefined)
        .length

    return any ? found > 0 : found == roles.length
}