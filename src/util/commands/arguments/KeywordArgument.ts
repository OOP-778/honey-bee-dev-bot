import {EnhancedMap} from "../../EnhancedMap";
import {ArgumentMap} from "../ArgumentMap";
import {CommandArgument} from "../CommandArgument";

export class KeywordArgument extends CommandArgument<string> {

    matchcase: boolean;
    keywords: EnhancedMap<string>;

    constructor() {
        super();
        this.identifier = "keyword";
        this.name = "A keyword";
        this.description = "A specific word";
        this.fallback = false;
        this.required = true;
        this.matchcase = true;
    }

    setMatchcase = (match: boolean) => this.matchcase = match;

    addKeyword = (word: string, ...aliases: string[]) => {
        this.keywords.set(word, word);
        aliases.forEach(a => this.keywords.set(a, word));
    }

    parse = (input: string) => {
        if (this.matchcase)
            return this.keywords.find((v, k) => input.startsWith(k));
        else return this.keywords.find((v, k) => input.toLowerCase().startsWith(k.toLowerCase()));
    }

    slice = (input: string, argmap: ArgumentMap, parsed?: string) => {
        const match = this.matchcase ? this.keywords.findKey((v, k) => input.startsWith(k)) : this.keywords.find((v, k) => input.toLowerCase().startsWith(k.toLowerCase()));
        return input.slice(match.length);
    }

    serialize = (input: string, argmap: ArgumentMap, parsed?: any) => parsed;

    toDisplay = (input: string, argmap: ArgumentMap, parsed?: any) => parsed;
}