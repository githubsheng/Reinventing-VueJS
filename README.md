# Chapter 6: Refactoring: Observer, Dep and Watcher

We’ve added a lot of code so far. So far all of our logic resides in `SV.js`. It is time to do some refactoring and move the code to the proper places: new files and maybe new packages. To make it easier to relate to the Vue.js source code, we will be creating similar classes and functions as Vue.js. The first 3 classes we will be creating are `Dependency`, `Observer` and `Watcher`. Let's look at them one by one.

We will have 3 new classes: `Observer`, `Watcher` and `Dependency`. For now, each of them will be responsible for following tasks:

## Dependency

We have seen that a data property or component property can be the dependency of multiple depending components / subscribers. So far we have been using a simple array list to manage all the subscribers, as shown below:

```js
function observe(obj, vm) {
	//omitted for brevity

	//this list records all subscribers
	let subscribers = [];

    Object.defineProperty(obj, key, {
        configurable: true,
        enumerable: true,
        get: function proxyGetter(){

            if(componentBeingRendered) {
            	//add a subscriber
                subscribers.push(componentBeingRendered);
            }
            return value;
        },
        set: function proxySetter(val){
        	//omitted for brevity

            subscribers.forEach(sub => {
            	//ask a subscriber to update.
                sub.update();
            });
        }
    });

    //omitted for brevity.
}
```

We also have a global variable floating in the air `componentBeingRendered` that points to the current component being rendered.

We will move the all the above logic into `Dependency` class:

```js
export default function Dependency () {
    this.subscribers = [];
    this.subscriberIds = new Set();
}

Dependency.componentBeingRendered = null;

Dependency.prototype.addSub = function (sub) {
    if(!this.subscriberIds.has(sub.watcherId)) {
        this.subscribers.push(sub);
        this.subscriberIds.add(sub.watcherId)
    }
};

Dependency.prototype.notify = function () {
    this.subscribers.forEach( sub => {
        sub.update();
    });
};
```

This class isn't very complicated. But there are two things to note: 
1. we have replaced the global `componentBeingRendered` with `Dependency.componentBeingRendered` to align with Vue's source code
2. we expect each subscriber to have an unique id and if a subscriber's id is found to already exist in `this.subscriberIds`, we will not add the subscriber anymore. This is useful as it prevents the same subscriber to be added twice. If a subscriber is added twice, it will also be updated twice, and the second update is unwanted.

Next, we will modify our `SV.js` to make use of our brand new `Dependency`. We will first modify our `observe` method, and replace our array `subscribers` with an instance of `Dependency`.

```js
function observe(obj) {
    const keys = Object.keys(obj);
    let i = keys.length;
    while(i--) {
        const key = keys[i];
        let value = obj[key];
        if(isReserved(key)) return;

        //instead of using an array to manage the subscribers, we use an instance of Dependency now.
        const dep = new Dependency();

        Object.defineProperty(obj, key, {
            configurable: true,
            enumerable: true,
            get: function proxyGetter(){
                if(Dependency.componentBeingRendered)
                    dep.addSub(Dependency.componentBeingRendered);
                return value;
            },
            set: function proxySetter(val){
                value = val;
                if(isObject(value)) observe(value);
                dep.notify();
            }
        });

        if(isObject(value))
            observe(value);
    }
}
```

Also, when we are rendering a component, we now need to update `Dependency.componentBeingRendered` rather than `componentBeingRendered`:

```js
SV.prototype.evaluate = function(){
    Dependency.componentBeingRendered = this;
    const ret = this.options.render.call(this);
    Dependency.componentBeingRendered = null;
    return ret;
};
```

Our job with `Dependency` is done here. Next, let's take a look at the `Observer` class.

## Observer

Our `Observer` will mainly contain the logic related to observing changes and tracking dependencies. It creates getters and setters for each data property or component properties. We will refactored the related logic out from `SV.js` and move them to `Observer`.

This is the definition of `Observer`

```js
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

export function defineReactive (obj, key, value) {
    if(isReserved(key)) return;

    const dep = new Dependency();

    Object.defineProperty(obj, key, {
        configurable: true,
        enumerable: true,
        get: function proxyGetter(){
            if(Dependency.componentBeingRendered) {
                dep.addSub(Dependency.componentBeingRendered);
            }

            return value;
        },
        set: function proxySetter(val){
            value = val;
            if(isObject(value))
                observe(value);
            dep.notify();
        }
    });

    if(isObject(value))
        observe(value);
}

export function observe (value) {
    if (!isObject(value)) return;
    return new Observer(value)
}
```

As you can see in the above code definition, we basically copied all the code from `observe` function in `Vue.js`, to our `Observer` class. And `new Observer(obj)` is basically equivalent to `vm.observe(obj)`. This makes the code clearer as most the of logic related to reactivity is now put in `Observer`. At the end of `Observer.js`, we expose a `observe` function. This function simply creates an instance of `Observer` class and delegate all the hard work to it. 

## Watcher

So far, we have put subscriber management logic into `Dependency`, reactivity logic into `Observer`. The last remaining piece is `Watcher`. We will place the component update logic in our `Watcher`. At this stage, our `Watcher` is very simple.

```js
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
```

To explain how `Watcher` works, it is probably easier to start with how we uses it. To use it, we will first add a new method in `Vue.js`:

```js
SV.prototype.callback = function(newVal){
    this.patch(newVal);
    this.value = newVal;
};
```

and we will create a new instance of `Watcher` like the following:

```js
vm.watcher = new Watcher(vm, this.evaluate, this.callback, null /*null is options, for now we just leave it to null*/);
```

To update the a componet, we can do either of the following. If you take a minute to examine the call sequence, you will notice that these two ways are identical: firstly `vm.evaluate` is called, and `vm.patch` is called subsequently.

```js
// update the component via its `update` method
vm.update();

// update the component via its `Watcher` instance
vm.watcher.update();
```

Either approach is fine, and they do exactly the same thing. So why all the effort in making all the extra code? For now, the most immediate benefit is that our code structure will align with the original Vue.js source code. It will make it easier for you should you choose to read Vue.js source code later on. There are two other benefits:

1. We will later optimize the update process and we will add more complicated logic. Instead of putting all them into a single `Vue.js` file, our `Watcher` is the perfect place to add them.

2. In later chapters, we will see that component is not the only thing we need to update. For instance, we also have computed properties and they too need to be updated, in a very similar way. Delegating the common part of update workflow to our `Watcher` class makes it easy to achieve code reuse.

If the last two points do not make much sense at the moment, it is fine. We will be revisiting `Watcher` class many times in later chapters as we continue our implementation of SV. By then, it will be easier to justify `Watcher` class.

From now on, we will stick to using `Watcher` class for component update. We can then remove `vm.update` method as it is no longer needed. 

At the same time, we will rename the `vm.callback` method to `vm._update` method, to align with Vue.js source code. This may seem a bit confusing, but in summary:

1. `vm.update` => removed
2. `vm.callback` => `vm._udpate`

Another thing to pay attention is, with `Watcher`, we no longer points `Dependency.componentBeingRendered` to a component. Instead, when a component is being rendered, we point it to the component's watcher. Therefore, the component's watcher is recorded as a subscriber, instead of the component itself. You can think of the watcher as the component's representative. When we call `subscriber.update()`, it is the watcher's `update` method that gets called, and it will update the component properly. 

## A milestone

We have managed to organize our code into different smaller components. This lays a good foundation for the following development. There are a lot of code changes in this chapter, so be sure to check out the github code repository at least once. In the next chapter, we will try to implement watched property.



