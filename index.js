'use strict'

const { google } = require('googleapis')

const credentials_path = process.env?.GSHEETS_CREDENTIALS || process.cwd() + '/config/credentials.json'

const RENDER_TYPE = {
    FORMATTED: 'FORMATTED_VALUE',
    UNFORMATTED: 'UNFORMATTED_VALUE',
    FORMULA: 'FORMULA'
}

const GSheets = {}

const auth = new google.auth.GoogleAuth({
    keyFile: credentials_path,
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets'
    ]
})

const sheets = google.sheets({ version: 'v4', auth })

GSheets.select = async (params) => {
    let sheet_id = params.sheet_id
    let range = params.range
    let where = params.where

    let data = []
    let header = []

    const rows = await get({ sheet_id, range })

    header = rows.shift()

    for (let row of rows) {
        let map = {}
        let columns = row

        for (let i = 0; i < columns.length; i++) {
            let column = header[i]

            map[column] = columns[i]
        }

        data.push(map)
    }

    if (where) {
        for (let key of Object.keys(where)) {
            if (key?.endsWith('__not')) {
                let _key = key.replace('__not', '')

                data = data.filter(d => d[_key] != where[key])
            } else if (key?.endsWith('__is')) {
                let _key = key.replace('__is', '')

                data = data.filter(d => d[_key] === where[key])
            } else if (key?.includes('__or__')) {
                let isEqual = true

                if (key?.endsWith('__not')) {
                    isEqual = false

                    key = key.replace('__not', '')
                }

                let _keys = key.split('__or__')
                let _vals = where[key]

                data = data.filter(d => {
                    for (let i = 0; i < _keys.length; i++) {
                        let __key = _keys[i]
                        let criteria = isEqual ? d[__key] == _vals[i] : d[__key] != _vals[i]

                        if (criteria) {
                            return true
                        }
                    }
                })
            } else if (key?.endsWith('__has')) {
                let _key = key.replace('__has', '')

                data = data.filter(d => d[_key]?.contains(where[key]))
            } else if (key?.endsWith('__iHas')) {
                let _key = key.replace('__iHas', '')

                data = data.filter(d => d[_key]?.toUpperCase().contains(where[key]?.toUpperCase()))
            } else {
                data = data.filter(d => d[key] === where[key])
            }
        }
    }

    return data
}

GSheets.insert = async (params) => {
    params['insert'] = true

    await GSheets.append(params)
}

GSheets.append = async (params) => {
    const sheet_id = params.sheet_id
    const range = params.range
    const records = params.records
    const insert = params.insert || false

    const rows = await get({ sheet_id, range, render_type: RENDER_TYPE.FORMULA })

    if (rows.length < 1) throw new Error("No header found.")

    const header = rows[0] || []
    const data = rows

    for (let record of records) {
        let newRow = []

        for (let key of header) {
            let value = record[key] || ''

            newRow.push(value)
        }

        let rowIndex = -1

        if (insert) {
            rowIndex = data.findIndex(row => row.length == 0)
        }

        if (rowIndex != -1) {
            data[rowIndex] = newRow
        } else {
            data.push(newRow)
        }

    }

    await update({ sheet_id, range, values: data })
}

GSheets.update = async (params) => {
    let sheet_id = params.sheet_id
    let range = params.range
    let where = params.where || {}
    let fields = params.fields || {}

    const rows = await get({ sheet_id, range })

    if (rows.length < 1) throw new Error("No header found.")

    const header = rows[0] || []
    const data = rows
    const values = await get({ sheet_id, range, render_type: RENDER_TYPE.FORMULA })

    for (let key of Object.keys(where)) {
        let columnIndex = header.indexOf(key)
        let criteria = where[key]

        if (columnIndex == -1) continue

        for (let i = 1; i < data.length; i++) {
            let row = data[i]

            if (row[columnIndex] == criteria) {

                for (let key of Object.keys(fields)) {
                    let valueIndex = header.indexOf(key)

                    let newRow = row
                    newRow[valueIndex] = fields[key]
                    row = newRow
                }

                values[i] = row
            }
        }
    }

    await update({ sheet_id, range, values })
}

async function get(params) {
    let sheet_id = params.sheet_id
    let range = params.range
    let render_type = params.render_type || RENDER_TYPE.FORMATTED

    const data = await sheets.spreadsheets.values.get({
        spreadsheetId: sheet_id,
        range: range,
        valueRenderOption: render_type
    }).then(res => { return res?.data?.values || [] })

    return data
}

async function update(params) {
    let sheet_id = params.sheet_id
    let range = params.range
    let values = params.values

    await sheets.spreadsheets.values.update({
        spreadsheetId: sheet_id,
        range: range,
        valueInputOption: 'USER_ENTERED',
        resource: { values: values },
    })
}

module.exports = GSheets