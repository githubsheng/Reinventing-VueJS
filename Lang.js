export function isReserved (str) {
    const c = (str + '').charCodeAt(0);
    return c === 0x24 || c === 0x5F
}

export function isObject (obj) {
    return obj !== null && typeof obj === 'object'
}