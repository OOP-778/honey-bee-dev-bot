import {EnhancedMap} from "../EnhancedMap";
import {ArgumentValues} from "./CommandArgument";

export class ArgumentMap {

    values: EnhancedMap<any>;
    serializedValues: EnhancedMap<string>;
    displayValues: EnhancedMap<string>;

    constructor() {
        this.values = new EnhancedMap();
        this.serializedValues = new EnhancedMap();
        this.displayValues = new EnhancedMap();
    }

    setValues(setting: string, valueObject: ArgumentValues<any>) {
        this.values.set(setting, valueObject.value);
        this.serializedValues.set(setting, valueObject.serialized);
        this.displayValues.set(setting, valueObject.display);
    }

    get = <T>(setting: string): T => this.values.get(setting);

    getSerialized = (setting: string): string => this.serializedValues.get(setting);

    getDisplay = (setting: string): string => this.displayValues.get(setting);

    has = (setting: string): boolean => this.values.has(setting);

}