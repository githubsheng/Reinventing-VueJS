export default function Dependency () {
    this.subscribers = [];
    this.subscriberIds = new Set();
}

Dependency.componentBeingRendered = null;

Dependency.prototype.addSub = function (sub) {
    if(!this.subscriberIds.has(sub.watcherId)) {
        this.subscribers.push(sub);
    }
};

Dependency.prototype.notify = function () {
    this.subscribers.forEach( sub => {
        sub.update();
    });
};