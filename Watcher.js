import Dependency from "./Dependency.js";
import {parsePath} from "./Lang.js";

let watcherId = 0;

export default function Watcher(vm, expOrFunc, callback, options) {
    //`watcherId` is checked by `Dependency` to avoid the same watcher being added as subscriber of the same dependency twice.
    this.watcherId = watcherId++;
    this.vm = vm;

    if (typeof expOrFunc === 'function') {
        //expOrFunc is a evaluation function, we will just call it later.
        this.getter = expOrFunc
    } else {
        //expOrFunc is an expression, we will treat it as a property of vm.
        this.getter = parsePath(expOrFunc);
    }

    this.callback = callback;
    this.value = this.get();
    this.oldValue = this.value;
}

Watcher.prototype.run = function(){
    this.value = this.get();
    this.callback.call(this.vm, this.value, this.oldValue);
    this.oldValue = this.value;
};

Watcher.prototype.update = function(){
    this.run();
};

Watcher.prototype.get = function () {
    this.beforeGet();
    // the first `this.vm` acts as `this` during the function call, this second `this.vm` is the parameter we provide to function.
    const value = this.getter.call(this.vm, this.vm);
    this.afterGet();
    return value;
};

let previousComponentBeingRendered;

Watcher.prototype.beforeGet = function () {
    previousComponentBeingRendered = Dependency.componentBeingRendered;
    Dependency.componentBeingRendered = this;
};

Watcher.prototype.afterGet = function () {
    Dependency.componentBeingRendered = previousComponentBeingRendered;
};
