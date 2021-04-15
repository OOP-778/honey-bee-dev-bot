import {EnhancedMap} from "../../../util/EnhancedMap";
import {Message} from "discord.js";
import {Pair, safeDelete} from "../../../util/misc";

export const registeredQuestions: EnhancedMap<QuestionType> = new EnhancedMap<QuestionType>()
registeredQuestions.set("text", {
    type: "text",
    emoji: "📝",
    handler: async message => {
        return new Pair(message.cleanContent, null)
    }
})

export interface QuestionType {
    type: string
    emoji: string
    handler: (message: Message) => Promise<Pair<any, string>>
}