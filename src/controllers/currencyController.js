'use strict'

const Currency = require('../models/Currency')
const client = require('../config/cache/redis-connection')
const Validator = require('Validator')
const { default: axios } = require('axios')
const base_url = process.env.CONVERSION_ENDPOINT

class CurrencyController {

    async index(req, res){
        return res.status(200).json({
            currency_labels: {
                bid: "Compra",
                ask: "Venda",
                varBid: "Variação",
                pctChange: "Porcentagem de Variação",
                high: "Máximo",
                low: "Mínimo"
            },
            api_responses_labels:{
                converted_value: "O valor da conversão utilizando amount"
            },
            info: "hey HURB :)"
        })
    }
    async getAllSupportedCurrencies(req, res){
        try {
            const { data } = await axios.get(`${base_url}/json/all`)

            let allCurrencies = []

            Object.entries(data).forEach(async([key, value]) => {

                let currency = {
                    code: value.code,
                    codein: value.codein,
                    name: value.name,
                    high: value.high,
                    low: value.low,
                    varBid: value.varBid,
                    pctChange: value.pctChange,
                    bid: value.bid,
                    ask: value.ask,
                    timestamp: value.timestamp,
                    create_date: value.create_date
                }

                allCurrencies.push(currency)
            })

            const createdCurrencies = await Currency.find({})

            Object.entries(createdCurrencies).forEach(async([key, value]) => {
                let currency = {
                    code: value.code,
                    codein: value.codein,
                    name: value.name,
                    high: value.high,
                    low: value.low,
                    varBid: value.varBid,
                    pctChange: value.pctChange,
                    bid: value.bid,
                    ask: value.ask,
                    timestamp: value.timestamp,
                    create_date: value.create_date
                }

                allCurrencies.push(currency)
            })

            client.setex(
                'allCurrencies',
                process.env.REDIS_TTL,
                JSON.stringify(allCurrencies)
            )

            res
            .status(200)
            .json({
                data: allCurrencies,
                info: 'data from api and database'
            })
        } catch (e) {
            return res
            .status(500)
            .json(e)
        }
    }

    async addCurrency(req, res){

        const {
            code,
            codein,
            name,
            high,
            low,
            varBid,
            pctChange,
            bid,
            ask,
            timestamp,
            create_date
        } = req.body


        const data = {
            code,
            codein,
            name,
            high,
            low,
            varBid,
            pctChange,
            bid,
            ask,
            timestamp,
            create_date
        }

        const rules = {
            code        : 'required|exists',
            codein      : 'required|exists',
            name        : 'required',
            high        : 'required',
            low         : 'required',
            varBid      : 'required',
            pctChange   : 'required',
            bid         : 'required',
            ask         : 'required'
        }

        const messages = {
            required: ':attr is required',
            exists: ':attr already exists'
        }

        const existsCurrency = await Currency.exists({ code: data.code, codein: data.codein })

        function exists() {
            if (existsCurrency) {
                return false
            }
            return true
        }

        const v = Validator.make(data, rules, messages)
        v.extend('exists', exists, ':attr already exists.')

        if (v.fails()) {
            const errors = v.getErrors()

            return res
            .status(400)
            .json(errors)
        }

        try {

            const newCurrency = await Currency.create(data)

            client.setex(
                'allCurrencies',
                process.env.REDIS_TTL,
                JSON.stringify(newCurrency)
            )

            return res
            .status(201)
            .json({
                data: newCurrency,
                info: 'currency created!'
            })
        }catch (e) {
            return res
            .status(400)
            .json(e)
        }

    }

    async deleteCurrency(req, res){

        const {
            code, codein
        } = req.body

        const data = {
            code,
            codein
        }

        const rules = {
            code: 'required',
            codein: 'required'
        }

        const messages = {
            'required' : ':attr is required'
        }

        const v = Validator.make(data, rules, messages)

        if (v.fails()) {
            const errors = v.getErrors();
            res
            .status(400)
            .json(errors)
        }

        try {

            await Currency.deleteOne({code: data.code, codein: data.codein})

            return res
            .status(200)
            .json({
                info: 'currency deleted!'
            })
        }catch (e) {
            return res
            .status(400)
            .json(e)
        }
    }
}

module.exports = new CurrencyController()