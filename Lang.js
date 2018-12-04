export function isReserved (str) {
    const c = (str + '').charCodeAt(0);
    return c === 0x24 || c === 0x5F
}

export function isObject (obj) {
    return obj !== null && typeof obj === 'object'
}

const bailRE = /[^\w\.]/
export function parsePath (path) {
    if (!bailRE.test(path)) {
        path = path.split('.');
        return function (obj) {
            for (let i = 0; i < path.length; i++) {
                if (!obj) return;
                obj = obj[path[i]]
            }
            return obj;
        }
    }
}
