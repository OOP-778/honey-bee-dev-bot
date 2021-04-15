import {VTCommand} from "../../../util/commands/VTCommand";
import {TicketsAdmin} from "./admin";

export class TicketsCmd extends VTCommand {
    label: string = "tickets"
    category = "tickets"

    constructor() {
        super();
        this.registerSubcommand(new TicketsAdmin())
    }
}
