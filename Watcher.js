import Dependency from "./Dependency.js";

export default function Watcher(vm, evaluateFunc, callback, options) {
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
