import {isObject, isReserved} from "./Lang";
import Dependency from "./Dependency";

export function Observer (value) {
    this.value = value;
    this.walk(value);
}

Observer.prototype.walk = function (obj) {
    const keys = Object.keys(obj);
    for (let i = 0, l = keys.length; i < l; i++) {
        this.convert(keys[i], obj[keys[i]])
    }
};

Observer.prototype.convert = function (key, val) {
    defineReactive(this.value, key, val)
};

export function observe (value) {
    if (!isObject(value)) return;
    return new Observer(value)
}

export function defineReactive (obj, key, value) {
    //if property is reserved, move on
    if(isReserved(key)) return;

    const dep = new Dependency();

    //we want to define getters and setters for this property, on `obj` instance.
    Object.defineProperty(obj, key, {
        configurable: true,
        enumerable: true,
        get: function proxyGetter(){
            //for now, getter simply returns the original value.
            if(Dependency.componentBeingRendered) {
                dep.addSub(Dependency.componentBeingRendered);
            }

            return value;
        },
        set: function proxySetter(val){
            //update the property value. We are not doing `obj[key] = val` because it results in infinite call loop
            value = val;

            //if the new value is an object, we also need to set up getters and setters on this object as well.
            if(isObject(value))
                observe(value);

            //we only need to update all the depending components / subscribers.
            dep.notify();
        }
    });

    //if property is an object, we recursively set up getters and setter on this object as well.
    if(isObject(value))
        observe(value);
}