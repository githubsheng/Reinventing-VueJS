export default function Dependency () {
    this.subscribers = []
}

Dependency.componentBeingRendered = null;

Dependency.prototype.addSub = function (sub) {
    this.subscribers.push(sub)
};

Dependency.prototype.removeSub = function (sub) {
    const index = this.subscribers.indexOf(sub);
    if(index !== -1) this.subscribers.splice(index, 1);
};

Dependency.prototype.notify = function () {
    this.subscribers.forEach( sub => {
        sub.update();
    });
};
