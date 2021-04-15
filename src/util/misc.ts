import {Message} from "discord.js";

export class Pair<T1, T2> {

    key: T1
    value: T2

    constructor(a: T1, b: T2) {
        this.key = a
        this.value = b
    }
}

export class Cache<T> {
    map: Map<string, Pair<T, Date>> = new Map()

    cacheTime: number
    onTimeOut: (T) => void

    constructor(
        cacheTimeOut: number,
        onTimeOut: (T) => void = ob => {
        }
    ) {
        this.cacheTime = cacheTimeOut
        this.onTimeOut = onTimeOut
    }

    get(key: string): T {
        let mapElement = this.map[key];
        if (mapElement && this.cacheTime != 0) {
            let difference = (new Date().getTime() - mapElement.value.getTime()) / 1000
            if (difference >= this.cacheTime) {
                this.onTimeOut(mapElement.value)
                this.map.delete(key);
                return undefined;
            }
        }
        return mapElement?.key
    }

    remove(key: string) {
        this.map.delete(key)
    }

    put(key: string, object: T) {
        this.map[key] = new Pair<T, Date>(object, new Date())
    }
}

export function isTypeOfInterface(object: any, method: string, isMethod: boolean = true): boolean {
    return getMethods(object, isMethod)
        .filter((key, value) => {
            return key == method;
        }).length > 0
}

function getMethods(object, isMethod): string[] {
    let properties = new Set()
    let currentObj = object
    do {
        Object.getOwnPropertyNames(currentObj).map(item => properties.add(item))
    } while ((currentObj = Object.getPrototypeOf(currentObj)))
    // @ts-ignore
    return isMethod ? [...properties.keys()].filter(item => typeof object[item] === 'function') : [...properties.keys()]
}

export function safeDelete(message: Message, time: number = 0) {
    if (message == undefined) return

    if (time == 0)
        message.delete().catch(error => {
        })
    else
        message.delete({timeout: time}).catch(error => {
        })
}

export function generateId(length): string {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}