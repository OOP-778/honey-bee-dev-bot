import {ArgumentMap} from "./ArgumentMap";

export abstract class CommandArgument<T> {

    /* Information about argument */
    identifier: string = "argument"; // Used as key in the argument map    
    required: boolean = true; // If this argument needs to be given or not
    fallback: boolean = false; // In case the argument is not required and not given, always return default or not
    default?: (input: string, argmap: ArgumentMap, ...args: any) => T; // If this value was not given, return this value

    /* Cosmetic */
    name: string = "Argument"; // Name that shows up in help
    description: string = "Argument"; // Description that shows up in help

    /* Functions */
    abstract parse: (input: string, argmap: ArgumentMap, ...args: any) => T | Promise<T>;
    abstract slice: (input: string, argmap: ArgumentMap, parsed?: T) => string;
    abstract serialize: (input: string, argmap: ArgumentMap, parsed?: T) => string;
    abstract toDisplay: (input: string, argmap: ArgumentMap, parsed?: T) => string;

    setIdentifier = (paramString: string): CommandArgument<T> => {
        this.identifier = paramString;
        return this;
    }

    setDefault = (paramDefault: (input: string, argmap: ArgumentMap, ...args: any) => T): CommandArgument<T> => {
        this.default = paramDefault;
        return this;
    }

    setRequired = (paramBoolean: boolean): CommandArgument<T> => {
        this.required = paramBoolean;
        return this;
    }

    setFallback = (paramBoolean: boolean): CommandArgument<T> => {
        this.fallback = paramBoolean;
        return this;
    }

    setName = (paramString: string): CommandArgument<T> => {
        this.name = paramString;
        return this;
    }

    setDescription = (paramString: string): CommandArgument<T> => {
        this.description = paramString;
        return this;
    }

    getValues = async (input: string, argmap: ArgumentMap, ...args: any): Promise<ArgumentValues<T>> => {
        let value: T = await this.parse(input, argmap, ...args);
        if (value === undefined && (this.required || this.fallback) && this.default !== undefined) value = this.default(input, argmap, ...args);
        return {
            value: value,
            serialized: value === undefined ? undefined : this.serialize(input, argmap, value),
            display: value === undefined ? undefined : this.toDisplay(input, argmap, value),
            output: this.slice(input, argmap, value)
        }
    }
}

export interface ArgumentValues<T> {
    value: T,
    serialized: string,
    display: string,
    output: string
}