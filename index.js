import express, { json, text } from 'express'
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import cors from 'cors'
import joi from 'joi'
import dayjs from 'dayjs'

dotenv.config()
dayjs().format()

const mongoClient = new MongoClient("mongodb://localhost:27017")
let db
mongoClient.connect(() => {
    db = mongoClient.db("o_banco_de_dados_apenas")
})

const server = express()
server.use(json())
server.use(cors())

const participantSchema =  joi.object({
    name: joi.string().required()
})

const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid('message', 'private_message').required()
})

/* participants routes */

server.post('/participants', async (req, res) => {
    const participant = req.body.name    

    console.log(participant)
    
    const validation = participantSchema.validate(req.body)

    if (validation.error) {
        res.status(422).send(validation.error.message)
        return
    }
 
    
    try {
        
        const participantExists = await db.collection('participants').findOne({name: req.body.name})
        
        console.log(participantExists)
    
        if(participantExists) {
            console.log("achamo o trem")
            res.sendStatus(409)
            return
        }
        
        await db.collection('participants').insertOne({ name: participant, lastStatus: Date.now()})
        await db.collection('messages').insertOne({
            from: participant,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format('HH:mm:ss')
        })
        res.sendStatus(201)
    } catch (error) {
        res.sendStatus(500)
    }
})

server.get('/participants', async (req, res) => {
    try {
        const participants = await db.collection('participants').find().toArray()
        res.send(participants)
    } catch (error) {
        console.log("ficou perdidinho")
        res.sendStatus(500)
    }
})

server.delete('/participants', async (req, res) => {
    try {
        await db.collection('participants').deleteMany({ })
        await db.collection('messages').deleteMany({ })
        res.sendStatus(200)
    } catch(error) {
        res.sendStatus(500)
    }
})

/* messages routes */

server.post('/messages', async (req, res) => {
    const user = req.headers.user
    const message = req.body

    const validation = messageSchema.validate(req.body)

    if (validation.error) {
        res.status(422).send(validation.error.message)
        return
    }

    try {
        await db.collection('messages').insertOne({
            from: user,
            ... message,
            time: dayjs().format('HH:mm:ss')
        })
        res.sendStatus(201)
    } catch (error) {
        res.sendStatus(500)
    }
})

server.get('/messages', async (req, res) => {
    const user = req.headers.user
    const limit = parseInt(req.query.limit)

    try {
        const messages = await db.collection('messages').find({
            $or: [
                {to: req.headers.user},
                {type: "message"},
                {type: "status"}
            ]
        }).toArray()

        if(limit){
            res.send(messages.slice(-limit))
        } else {
            res.send(messages)
        }
    } catch (error) {
        console.log("ficou perdidinho")
        res.sendStatus(500)
    }
})





server.listen(5000, () => {
    console.log('shhhh')
})