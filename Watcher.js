import Dependency from "./Dependency.js";

let watcherId = 0;

export default function Watcher(vm, evaluateFunc, callback, options) {
    //`watcherId` is checked by `Dependency` to avoid the same watcher being added as subscriber of the same dependency twice.
    this.watcherId = watcherId++;
    this.vm = vm;
    this.getter = evaluateFunc;
    this.callback = callback;
    this.value = this.get();
}

Watcher.prototype.run = function(){
    this.value = this.get();
    this.callback.call(this.vm, this.value);
};

Watcher.prototype.update = function(){
    this.run();
};

Watcher.prototype.get = function () {
    this.beforeGet();
    const value = this.getter.call(this.vm);
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
