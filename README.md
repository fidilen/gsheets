# gsheets
GSheets API

.env
```
GSHEETS_CREDENTIALS=/path/to/credentials.json
```

```js
await GSheets.select({
    sheet_id: SHEET_ID,
    range: RANGE,
    where: {...}
})
```

```js
await GSheets.insert({
    sheet_id: SHEET_ID,
    range: RANGE,
    records: [
        {...}
    ]
})
```

```js
await GSheets.append({
    sheet_id: SHEET_ID,
    range: RANGE,
    where: {...}
})
```

```js
await GSheets.update({
    sheet_id: SHEET_ID,
    range: RANGE,
    where: {...}
})
```

```js
await GSheets.delete({
    sheet_id: SHEET_ID,
    range: RANGE,
    where: {...}
})
```