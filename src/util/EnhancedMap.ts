import {Pair} from "./misc";

export class EnhancedMap<T> {

    map: Map<string, T>;

    constructor() {
        this.map = new Map();
    }

    static fromJson<T>(json: any): EnhancedMap<T> {
        const s = new EnhancedMap<T>();
        Object.keys(json).forEach(k => s.set(k, json[k]))
        return s;
    }

    static fromString<T>(str: string): EnhancedMap<T> {
        try {
            const json = JSON.parse(str);
            return EnhancedMap.fromJson<T>(json);
        } catch {
            console.log("Failed to load settings from string")
            return undefined;
        }
    }

    load(values: Map<string, T>[], overwrite: boolean = false): EnhancedMap<T> {
        values.forEach(map => map.forEach((value, key) => {
            if (overwrite || !this.map.has(key)) this.map.set(key, value)
        }));
        return this;
    }

    set(key: string, value: T): EnhancedMap<T> {
        this.map.set(key, value);
        return this;
    }

    get = <V>(key: string): V => this.map.get(key) as unknown as V;

    remove = (key: string) => this.map.delete(key);

    toJson = (): object => {
        let output = {};
        this.map.forEach((v, k) => output[k] = v);
        return output;
    }

    has = (setting: string): boolean => this.map.has(setting) && this.map.get(setting) !== undefined && this.map.get(setting) !== null;

    clear = () => this.map.clear();

    size = (): number => this.map.size;

    keys = (): string[] => Array.from(this.map.keys());

    values = (): T[] => Array.from(this.map.values());

    filter = (filter: (value: T, key: string) => boolean): [string, T][] => {
        let output: [string, T][] = [];
        for (const entry of this.map.entries()) {
            if (filter(entry[1], entry[0])) output.push(entry);
        }
        return output;
    }

    find = (filter: (value: T, key: string) => boolean): T => {
        for (const entry of this.map.entries()) {
            if (filter(entry[1], entry[0])) return entry[1];
        }
        return undefined;
    }

    findKey = (filter: (value: T, key: string) => boolean): string => {
        for (const entry of this.map.entries()) {
            if (filter(entry[1], entry[0])) return entry[0];
        }
        return undefined;
    }

    entries = (): Pair<string, T>[] => {
        return Array.from(this.map.entries())
            .map(value => new Pair<string, T>(value[0], value[1]));
    }
}