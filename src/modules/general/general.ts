import {ClientModule, WrappedClient} from "../../client";
import {toMillis} from "../../util/TimeUtil";
import {TextChannel} from "discord.js";
import {Users} from "../user/users";
import {Tickets} from "../ticket/tickets";

export class General implements ClientModule {
    disable(): void {
    }

    load() {
        // Update Customers & Open tickets
        setInterval(async () => {

            // Update customers
            const customersChannel = Array.from(
                WrappedClient.instance.guild.channels.cache
                    .values()
            )
                .find(channel => channel.id === '795571446445244426')
            if (customersChannel != undefined) {
                const allUsers = await WrappedClient.instance.module<Users>("users").getAll()
                const count = allUsers
                    .filter(user => user.resources.length > 0)
                    .length

                await customersChannel.setName(`Customers: ${count}`)
            }

            const ticketsChannel = Array.from(
                WrappedClient.instance.guild.channels.cache
                    .values()
            )
                .find(channel => channel.id === '810396801559429140')

            if (ticketsChannel != undefined) {
                const ticketCount = (await WrappedClient.instance.module<Tickets>("tickets").ticketManager.getAll())
                    .length
                await ticketsChannel.setName(`Tickets: ${ticketCount}`)
            }
        }, toMillis(40))
    }

    name(): string {
        return "General";
    }
}