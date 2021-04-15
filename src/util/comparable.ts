export function toComparable(obj) {
    if (obj == undefined) return undefined

    let keys = Object.keys(obj)
    let results = []
    keys.sort((a, b) => a > b ? -1 : a < b ? 1 : 0)
    keys.forEach(key => {
        let value = obj[key]
        if (typeof value === 'object') {
            value = toComparable(value)
        }
        results.push({
            key,
            value,
        })
    })
    return results
}

// use this function to compare
export function compareObject(a, b) {
    let aStr = JSON.stringify(toComparable(a))
    let bStr = JSON.stringify(toComparable(b))
    return aStr === bStr
}