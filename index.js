'use strict'

const { google } = require('googleapis')

const credentials_path = process.env?.GSHEETS_CREDENTIALS || process.cwd() + '/config/credentials.json'

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

    const rows = await sheets.spreadsheets.values.get({
        spreadsheetId: sheet_id,
        range: range
    }).then(res => { return res?.data?.values || [] })

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

GSheets.append = async (params) => {
    try {
        const sheetId = params.sheet_id
        const range = params.range
        const values = params.values

        await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: range,
            valueInputOption: `USER_ENTERED`,
            resource: { values: values }
        })
    } catch (e) {
        throw new Error(e);
    }
}

GSheets.update = async (params) => {
    try {
        let sheet_id = params.sheet_id
        let range = params.range
        let where = params.where || {}
        let values = params.values || {}

        const rows = await sheets.spreadsheets.values.get({
            spreadsheetId: sheet_id,
            range: range
        }).then(res => { return res?.data?.values || [] })

        if (rows.length <= 1) return

        const header = rows?.[0] || []

        const data = rows

        for (let key of Object.keys(where)) {
            let columnIndex = header.indexOf(key)
            let criteria = where[key]

            if (columnIndex == -1) continue

            for (let i = 1; i < data.length; i++) {
                let row = data[i]

                if (row[columnIndex] == criteria) {

                    for (let key of Object.keys(values)) {
                        let valueIndex = header.indexOf(key)

                        let newRow = row
                        newRow[valueIndex] = values[key]
                        row = newRow
                    }

                    data[i] = row
                }
            }
        }

        await sheets.spreadsheets.values.update({
            spreadsheetId: sheet_id,
            range: range,
            valueInputOption: `RAW`,
            resource: { values: data },
        })
    } catch (e) {
        throw new Error(e);
    }
}

module.exports = GSheets