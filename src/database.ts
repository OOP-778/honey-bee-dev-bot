import mongodb, {Db, MongoClient} from "mongodb"
import {WrappedClient} from "./client";
import {Cache, Pair} from "./util/misc";
import {terminal} from 'terminal-kit'
import {types} from "util";

export class DatabaseManager {
    registeredManagers: ModelHolder<any>[]
    client: MongoClient
    database: Db

    constructor() {
        this.registeredManagers = []
    }

    async connect() {
        this.client = await mongodb.connect(
            process.env.DB_URL,
            {useNewUrlParser: true, useUnifiedTopology: true}
        )
        this.database = await this.client.db("honeybee-bot")
        terminal.bgBlue("Connection with database established!\n")
    }

    findStorageOfItem = <T extends MongoModel>(item: T): ModelHolder<T> => this.registeredManagers.find(m => item instanceof m.type);
    findStorageByType = (type: typeof ModelHolder) => this.registeredManagers.find(m => typeof m == typeof type);
}

export abstract class ModelHolder<T extends MongoModel> {
    type: typeof MongoModel
    collection: string
    identifierExtractor: (item: T) => string
    identifier: string

    databaseManager: DatabaseManager = WrappedClient.instance.databaseManager
    itemsCache: Cache<T>

    protected constructor(
        type: typeof MongoModel,
        collection: string,
        identifier: string,
        cacheFor: number,
        keyExtractor: (item: T) => string
    ) {
        this.type = type
        this.collection = collection
        this.identifierExtractor = keyExtractor
        this.identifier = identifier
        this.itemsCache = new Cache(
            cacheFor
        )

        this.databaseManager.registeredManagers.push(this)
    }

    async save(item: T) {
        let collection = this.databaseManager.database.collection(this.collection);
        let identifier = this.identifier
        let filter = {}
        filter[identifier] = this.identifierExtractor(item)

        let schema = await collection
            .findOne(filter)
            .then(value => {
                return value
            });

        let data = new SerializedData()
        item.serialize(data)
        let currentObject = data.data

        // If data not found
        if (schema === null) {
            this.updateHash(item, currentObject)
            await collection.insertOne(currentObject)
            return
        }

        // If no cache is present
        if (item.getFieldsCache().size === 0) {
            await collection.updateOne(filter, {$set: currentObject})
            this.updateHash(item, currentObject)
            return
        }

        this.itemsCache.put(this.identifierExtractor(item), item)

        let updatedObject = {}
        for (let key in currentObject) {
            if (key === "fieldsCache") continue

            if (item.getFieldsCache()[key] != hashCode(currentObject[key]))
                updatedObject[key] = currentObject[key]
        }

        await collection.updateOne(filter, {$set: updatedObject}, {upsert: true})
        this.updateHash(item, currentObject)
    }

    private updateHash(item: T, data: object) {
        let props = data as {}

        for (let key in props) {
            let value = props[key];
            item.getFieldsCache().set(key, hashCode(value))
        }
    }

    async findItemBy(identifierValue: string | object): Promise<T> {
        let collection = this.databaseManager.database.collection(this.collection);
        const filter = typeof identifierValue === "string" ? {[this.identifier]: identifierValue} : identifierValue;

        let item = this.itemsCache.get(filter[this.identifier]);
        if (item)
            return item

        return new Promise(async (resolve, reject) => {
            try {
                let scheme = await collection
                    .findOne(filter)
                    .then(item => {
                        return item
                    })

                if (scheme == null)
                    resolve(null)

                let data = new SerializedData(scheme as {})
                let item = new this.type() as T
                item.deserialize(data)

                this.updateHash(item, data)
                this.itemsCache.put(filter[this.identifier], item)
                resolve(item)
            } catch (error) {
                reject(error)
            }
        })
    }

    async deleteItemBy(identifierValue: string | object) {
        let collection = this.databaseManager.database.collection(this.collection);
        const filter = typeof identifierValue === "string" ? {[this.identifier]: identifierValue} : identifierValue;

        await collection.deleteOne(filter)
    }

    async findItemsBy(identifierValue: string | object): Promise<T[]> {
        let collection = this.databaseManager.database.collection(this.collection);
        const filter = typeof identifierValue === "string" ? {[this.identifier]: identifierValue} : identifierValue;

        return new Promise(async (resolve, reject) => {
            try {
                const scheme = await collection
                    .find(filter)
                    .toArray();

                if (scheme === null || scheme === undefined)
                    resolve(null)

                for (const x of scheme) {
                    let item = new this.type() as T
                    const data = new SerializedData(x as object)
                    item.deserialize(data)
                    this.updateHash(item, data)
                    this.itemsCache.put(filter[this.identifier], item)
                }

                resolve(scheme)
            } catch (error) {
                reject(error)
            }
        })
    }

    async getAll(): Promise<T[]> {
        let collection = this.databaseManager.database.collection(this.collection);
        const items = []
        let all = await collection.find({}).toArray()

        for (const x of all) {
            let item = new this.type() as T
            const data = new SerializedData(x as object)
            item.deserialize(data)

            this.updateHash(item, data)
            items.push(item)
        }

        return items
    }

    async findItemOrInsert(identifierValue: string, supplier: () => T): Promise<T> {
        let item = await this.findItemBy(identifierValue)
            .then(item => {
                return item
            });

        if (item == null) {
            item = supplier()
            await this.save(item)
        }

        return item
    }
}

function hashCode(value: any): number {
    if (!(typeof value === "string"))
        value = JSON.stringify(value)

    if (value == undefined)
        value = "undefined"

    return value.split("").reduce(function (a, b) {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a
    }, 0)
}

export class SerializedData {
    data: any

    constructor(data: any = {}) {
        this.data = data

        if (data instanceof Object)
            this.data = {...data}
    }

    toNumber(): number {
        return stringToNumber(this.data)
    }

    toString = (): string => this.data

    toBoolean(): boolean {
        return this.data === "1b"
    }

    toSerializable<T extends SerializableObject>(type: typeof SerializableObject): T {
        const object = new type()
        object.deserialize(this)

        return object as T
    }

    keys(): string[] {
        return this.data.keys()
    }

    applyAsNumber(key: string, supplier: (() => number) = null): number {
        const data = this.data[key]
        return data == undefined ? supplier ? supplier() : undefined : stringToNumber(data)
    }

    applyAsString(key: string, supplier: (() => number) = null): string {
        const data = this.data[key]
        return data == undefined ? supplier ? supplier() : undefined : data
    }

    applyAsBoolean(key: string, supplier: (() => boolean) = null): boolean {
        const data = this.data[key]
        return data == undefined ? supplier ? supplier() : undefined : data
    }

    applyAsSerializable<T extends SerializableObject>(key: string, type: typeof SerializableObject): T {
        let datum = this.data[key];
        if (datum ! instanceof Object) return null

        const object = new type()
        const data = new SerializedData(datum)
        object.deserialize(data)

        return object as T
    }

    applyAsList(key: string, supplier: (() => SerializedData[]) = () => []): SerializedData[] {
        const datum = this.data[key] as []
        if (datum == undefined)
            return supplier()

        return datum.map(obj => new SerializedData(obj))
    }

    applyAsMap(key: string, supplier: (() => Pair<SerializedData, SerializedData>[]) = () => []): Pair<SerializedData, SerializedData>[] {
        const valuesList = []
        const datumArr = this.data[key] as []

        if (datumArr == undefined)
            return supplier()

        for (let pairedObj of datumArr) {
            const key = pairedObj["key"]
            const value = pairedObj["value"]

            valuesList.push(new Pair(new SerializedData(key), new SerializedData(value)))
        }

        return valuesList
    }

    private writeToObj(obj?: any): any {
        if ((typeof obj) === 'number')
            return numberToString(obj as number)

        if ((typeof obj) === 'boolean')
            return obj == true ? "1b" : "0b"

        if ((typeof obj) === 'string') {
            return obj.toString()
        }

        if (types.isMap(obj)) {
            const objsList = []
            const map = (obj as Map<any, any>)
            map.forEach((value, key) => {
                const obj = {}
                obj["key"] = this.writeToObj(key)
                obj["value"] = this.writeToObj(value)
                objsList.push(obj)
            })
            return objsList
        }

        if (Array.isArray(obj)) {
            const convertedList = []
            const array = obj as []
            for (let element of array)
                convertedList.push(this.writeToObj(element))

            return convertedList
        }

        if (obj instanceof SerializableObject) {
            const serializedData = new SerializedData()
            obj.serialize(serializedData)
            return serializedData.data
        }
    }

    write(key: string, obj?: any) {
        if (obj == undefined)
            return

        this.data[key] = this.writeToObj(obj)
    }
}

export class SerializableObject {
    serialize(data: SerializedData) {
    }

    deserialize(data: SerializedData) {
    }
}

export function endsWith(text: string, character: string[]): boolean {
    for (let string of character) {
        if (text.endsWith(string))
            return true
    }

    return false
}

export function stringToNumber(input: string): number {
    if (!endsWith(input, ["i", "d", "f", "l"])) return undefined
    return Number(input.substr(0, input.length - 1))
}

export function numberToString(input: number): string {
    const value = input.toString()

    // Is double
    if (value.includes("."))
        return value + "d"

    return value + "l"
}

export class MongoModel extends SerializableObject {
    private fieldsCacheField: Map<string, number>

    getFieldsCache(): Map<string, number> {
        if (this.fieldsCacheField == null)
            this.fieldsCacheField = new Map()

        return this.fieldsCacheField
    }

    async save() {
        await WrappedClient.instance.databaseManager
            .findStorageOfItem(this)
            .save(this)
    }
}
