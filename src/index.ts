import {WrappedClient} from "./client"
import {terminal} from 'terminal-kit'

const client: WrappedClient = new WrappedClient();

process.chdir("./src")
start();

async function start() {
    await client.setup()

    client.once('ready', async () => {
        terminal.green.underline("Ping Pong Bot On | HoneyBeeDevelopment © 2020 v0.1\n")
        await client.load();

        terminal.bgBrightCyan("-").brightBlue(" Loaded total of %s commands\n", client.commands.size)
        terminal.bgBrightCyan("-").brightBlue(" Loaded total of %s modules\n", client.modules.size)
        terminal.bgBrightCyan("-").brightBlue(" Loaded total of %s events\n", client.eventsLoaded)
    });

    await client.login(process.env.BOT_TOKEN);
}

process.on('exit', async () => {
    await client.disable()
})
