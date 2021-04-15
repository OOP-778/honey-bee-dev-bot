import {ModelHolder, MongoModel, SerializableObject, SerializedData} from "./database";
import {ClientModule} from "./client";


export class ModulesSettings extends ModelHolder<PlainModuleSettings> {
    constructor() {
        super(
            PlainModuleSettings,
            "modulesSettings",
            "name",
            0,
            s => s.name
        );
    }

    async load(module: ClientModule, settings: ModuleSettings): Promise<ModuleSettings> {
        const plainSettings = await this.findItemOrInsert(module.name(), () => {
            const ms = new PlainModuleSettings()
            ms.holder = settings
            ms.name = module.name()
            return ms
        })

        if (plainSettings.data == undefined)
            plainSettings.data = new SerializedData()

        settings.deserialize(plainSettings.data)

        plainSettings.holder = settings
        plainSettings.name = module.name()

        return settings
    }

    get(module: ClientModule): PlainModuleSettings {
        return this.itemsCache.get(module.name())
    }
}

export abstract class ModuleSettings implements SerializableObject {
    abstract deserialize(data: SerializedData): void

    abstract serialize(data: SerializedData): void
}

export class PlainModuleSettings extends MongoModel {
    data: SerializedData
    holder?: ModuleSettings
    name: string

    syncWithHolder() {
        this.data.data = {}
        this.holder.serialize(this.data)
    }

    serialize(data: SerializedData) {
        this.holder.serialize(data)
        data.write("name", this.name)
    }

    deserialize(data: SerializedData) {
        this.data = data
    }
}