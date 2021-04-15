import {Client, Collection, Guild} from "discord.js";
import {VTCommand} from "./util/commands/VTCommand";
import {EnhancedMap} from "./util/EnhancedMap";
import {VTEvent} from "./util/events/VTEvent";
import {DatabaseManager} from "./database";
import {findFiles, findFolders} from "./util/FileUtil";
import {ModulesSettings} from "./moduleSettings";
import {isTypeOfInterface} from "./util/misc";
import {Verification} from "./modules/user/verification/verification";

import * as dotenv from 'dotenv';

export class WrappedClient extends Client {
    static instance: WrappedClient = null;

    eventsLoaded: number
    modules: Map<string, ClientModule>
    commands: Collection<string, VTCommand>;
    aliases: Collection<string, VTCommand>;
    settings: EnhancedMap<any>;
    databaseManager: DatabaseManager
    moduleSettingsHolder: ModulesSettings
    guild: Guild
    verification: Verification

    constructor() {
        super({
            restTimeOffset: 20
        });

        WrappedClient.instance = this;
        dotenv.config()

        console.log(process.env.DB_URL)

        this.eventsLoaded = 0
        this.commands = new Collection();
        this.modules = new Map();
        this.aliases = new Collection();

        this.settings = new EnhancedMap();
        this.verification = new Verification()
    }

    async setup() {
        this.databaseManager = new DatabaseManager()
        await this.databaseManager.connect()
    }

    module<T extends ClientModule>(name: string): T {
        return this.modules.get(name.toLowerCase()) as T
    }

    async load() {
        this.guild = await this.guilds.fetch(process.env.GUILD_ID, true)
        return new Promise<void>(async (resolve, reject) => {
            try {
                const folders = await findFolders("./modules");
                for (let folder of folders) {

                    await this.loadModule(`./modules/${folder}`)
                    await this.loadEvents(`./modules/${folder}/events`)
                    await this.loadCommands(`./modules/${folder}/commands`)

                }

                this.moduleSettingsHolder = new ModulesSettings()

                for (let clientModule of Array.from(this.modules.values()))
                    clientModule.load()

                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    async loadModule(path: string) {
        return new Promise(async (resolve, reject) => {
            try {
                const files: string[] = (await findFiles(path, false)).filter(f => f.endsWith(".js") || f.endsWith(".ts"));
                for (const file of files) {
                    const props = await import(`${path}/${file.split(".")[0]}`);
                    Object.keys(props)
                        .forEach(k => {
                            const module = new props[k]();
                            if (!isTypeOfInterface(module, "name")) return

                            this.modules.set(module.name().toLowerCase(), module as ClientModule)
                        })
                }
                resolve(null)
            } catch (e) {
                reject(e)
            }
        })
    }

    async loadCommands(path: string = "./commands") {
        return new Promise(async (resolve, reject) => {
            try {
                const files: string[] = (await findFiles(path, true)).filter(f => f.endsWith(".js") || f.endsWith(".ts"));
                for (const file of files) {
                    const props = await import(`${path}/${file.split(".")[0]}`);
                    Object.keys(props)
                        .filter(k => Object.getOwnPropertyDescriptors(Object.getPrototypeOf(props[k]))?.name?.value === "VTCommand")
                        .forEach(k => {
                            const cmd: VTCommand = new props[k]();
                            if (cmd.type === "default") {
                                this.commands.set(cmd.label, cmd);
                                if (cmd.aliases) cmd.aliases.forEach(c => this.aliases.set(c, cmd));
                            }
                        })
                }
                resolve(null)
            } catch (e) {
                reject(e)
            }
        })
    }

    async loadEvents(path: string = "./events") {
        return new Promise(async (resolve, reject) => {
            try {
                const files: string[] = (await findFiles(path)).filter(f => f.endsWith(".js") || f.endsWith(".ts"));
                for (const file of files) {
                    const props = await import(`${path}/${file.split(".")[0]}`);
                    Object.keys(props)
                        .filter(k => Object.getOwnPropertyDescriptors(Object.getPrototypeOf(props[k]))?.name?.value === "VTEvent")
                        .forEach(k => {
                            const ev: VTEvent = new props[k]();
                            if (ev.eventType === "on")
                                this.on(ev.eventName, args => ev.execute(this, args))
                            else
                                this.once(ev.eventName, args => ev.execute(this, args))

                            this.eventsLoaded += 1
                        })
                }
                resolve(null)
            } catch (e) {
                reject(e)
            }
        })
    }

    async disable() {
        for (let value of this.modules.values()) {
            await value.disable()
        }
    }
}

export interface ClientModule {
    // Method to get name of the module
    name(): string

    // Called when module is loaded
    load()

    // Called on exit
    disable(): void;
}
