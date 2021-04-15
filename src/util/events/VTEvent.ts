import {ClientEvents} from "discord.js";

export abstract class VTEvent {
    abstract eventName: keyof ClientEvents
    abstract eventType: string

    abstract execute: (...args: any) => void;

}