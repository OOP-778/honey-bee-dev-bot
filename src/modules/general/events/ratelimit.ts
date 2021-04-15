import {ClientEvents, RateLimitData} from "discord.js";
import {WrappedClient} from "../../../client";
import {VTEvent} from "../../../util/events/VTEvent";

export class StartUp extends VTEvent {
    eventName: keyof ClientEvents = "rateLimit";
    eventType = "on";

    execute = (client: WrappedClient, data: RateLimitData) => {
        // console.debug("[RATELIMIT]", data);
        // console.warn(`[RATELIMIT] Time-out: ${data.timeout}, Path: ${data.path}`);
    };
}
