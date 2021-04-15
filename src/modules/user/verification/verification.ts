import {Transporter} from "nodemailer";
import {readFileSync} from "fs";
import {gmail_v1} from "googleapis";
import Gmail = gmail_v1.Gmail;
import {ResourceData, User} from "../users";
import {getProducts} from "../../../products";
import {getMember, getRole} from "../../../util/FetchUtil";
import {WrappedClient} from "../../../client";

const nodemailer = require("nodemailer")

export class Verification {
    transporter: Transporter
    html: string

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: "mail.postale.io",
            port: 465,
            secure: true,
            auth: {
                user: process.env.MAIL_AUTH_USER,
                pass: process.env.MAIL_AUTH_PASS
            }
        });

        try {
            this.html = readFileSync((__dirname + "/contents.html").replace("dist", "src"), 'utf-8')
        } catch (e) {}
    }

    async sendCode(email: string, code: string): Promise<void> {
        await this.transporter.sendMail({
            from: '"Honey Bee Development" <info@honeybeedev.com>',
            to: email,
            subject: "Email Confirmation",
            text: `Your code is ${code}`,
            html: this.html.toString().replace("%CODE%", code),
        });
    }

    async insertPurchase(email: string, product: string) {
        const sqlite3 = require("sqlite3")
        const db = new sqlite3.Database((__dirname + "/purchases.db").replace("dist", "src"))

        db.run(`INSERT INTO purchases(mail, product) VALUES(?, ?)`, [email, product], function(err) {
            if (err) {
                return console.log(err.message);
            }
        });
        db.close()
    }

    async updatePurchases(user: User) {
        const fetchedProducts: ResourceData[] = []
        for (let email of user.emails) {
            fetchedProducts.push(...await this.findEmailPurchases(email))
            fetchedProducts.push(...await this.findPurchases(email))
        }

        user.resources = user.resources.filter(product => fetchedProducts.find(product2 => product2.product !== product.product) != undefined)
        user.resources.push(...fetchedProducts)

        const member = await getMember(WrappedClient.instance.guild, user.id)
        for (let resource of user.resources) {
            const product = getProducts().find(p => p.name === resource.product)
            if (product == undefined) continue

            await member.roles.add(await getRole(product.roleId, WrappedClient.instance.guild))
        }

        if (user.resources.length > 0)
            await member.roles.add(process.env.CUSTOMER_ROLE)

        await user.save()
    }

    async findPurchases(email: string): Promise<ResourceData[]> {
        return new Promise((resolve) => {
            const sqlite3 = require("sqlite3")
            const db = new sqlite3.Database((__dirname + "/purchases.db").replace("dist", "src"))
            db.all(`SELECT * FROM purchases WHERE mail='${email}'`, (_, value) => {
                const products = []
                for (let valueElement of value) {
                    const product = getProducts().find(p1 => p1.name.toLocaleLowerCase() === valueElement["product"].toString().toLocaleLowerCase())
                    if (product === undefined) continue

                    const data = new ResourceData()
                    data.product = product.name
                    data.date = "Unknown"
                    data.transactionID = "Unknown"
                    products.push(data)
                }
                db.close()
                resolve(products)
            })
        })
    }

    async findEmailPurchases(email: string): Promise<ResourceData[]> {
        const base64 = require("js-base64")
        return new Promise((resolve) => {
            new Mail(async gmail => {
                const messages = await gmail.users.messages
                    .list({
                        userId: "oskardhavel@gmail.com",
                        q: `from: service@intl.paypal.com \"${email}\"`
                    })

                const products: ResourceData[] = []
                if (!messages.data.messages) return resolve(products)

                for (let messageData of messages.data.messages) {
                    const message = await gmail.users.messages
                        .get({
                            userId: "oskardhavel@gmail.com",
                            id: messageData.id
                        })

                    const transactionIdRegex = />([\dA-Z]{17})</gm
                    for (let possibleProduct of getProducts()) {
                        const product = new ResourceData()

                        product.product = possibleProduct.name
                        const productRegex = new RegExp(`(${[possibleProduct.name, ...possibleProduct.possibleNames].join("|")})`, "gm")
                        const text = base64.decode(message.data.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'))

                        const match = text.match(productRegex)
                        if (match == undefined || match.length <= 0) continue

                        let transactionId = text.match(transactionIdRegex)[0]
                        transactionId = transactionId.substr(1, transactionId.length - 2)

                        const resourceData = new ResourceData()
                        resourceData.date = Intl.DateTimeFormat("en-us", {
                                timeZone: "Europe/Vilnius",
                                year: 'numeric',
                                month: 'numeric',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: 'numeric',
                                second: undefined,
                                hour12: false
                            }
                        ).format(new Date(Number(message.data.internalDate)))

                        resourceData.product = possibleProduct.name
                        resourceData.transactionID = transactionId
                        products.push(resourceData)
                        break
                    }
                }

                resolve(products)
            })
        })
    }
}

const {google} = require('googleapis');
const axios = require('axios')

export class Mail {
    constructor(onOpen: (gmail: Gmail) => Promise<void>) {
        const oAuthClient = new google.auth.OAuth2({
            clientId: "id",
            clientSecret: "secret-D"
        })

        axios({
            url: "url",
            method: 'post'
        }).then(async result => {
            oAuthClient.setCredentials({
                refresh_token: "RT",
                scope: "https://mail.google.com/",
                access_token: result.data["access_token"]
            })

            const gmail = google.gmail({version: 'v1', auth: oAuthClient})
            await onOpen(gmail)
        })
    }
}
