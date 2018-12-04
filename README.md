# Chapter 7: Implementing watched property

## A more general definition for Dependency and Subscriber

In the previous chapters, we defined the "dependency" and "subscriber" concept. Here is the recap:

If a component uses a `options.data` property for rendering, we say that this component “depends on” this data property. And this property is a “dependency” of the component, this component is a “depending component”, or “subscriber” of this property. When this dependency changes, our component needs to be re-rendered. We say this component needs “update”. 

It turns out components are not the only possible subscribers (techinically, components' watchers). In Vue.js, we can have watched properties. When we watch a property, we need to call the supplied evaluation function should this property changes.

For example, we want to call our log function if `options.data.message` changes.

```js
window.vm = new SV({
    el: '#app',
    data: {
        message: 'Great bargain!',
        dimensions: {
            width: '6 meters',
            height: '2 meters'
        }
    },
    watch: {
        message: function(newVal) {
            console.log("new message is " + newVal);
            console.log("message changed at " + (new Date()).toTimeString());
        }
    },
    render: function(){
        // omitted for brevity
    }
});
```

In the above example, Conceptually, we can say the log function "depends on" `options.data.message` and it needs to be re-evaluated if its dependency changes, or in other words, this log function "subscribes" to the changes of `options.data.message`. 

## Make use of Watchers

Since our log function is also conceptually a subscriber, just like the components we dicussed before, our first attempt would be treating it like a component. 

```js
function SV(options){
    this.options = options;
    initProps(this);
    initData(this);
    initMethods(this);
    // call initWatch after we have established the proxy and observers
    initWatch(this);
    const el = document.querySelector(options.el);
    if(el) {
        this.value = el;
        this.mount();
    }
}

function initWatch(vm) {
    const watch = vm.options.watch;
    if(!watch) return;

    Object.keys(watch).forEach(propName => {

        function evaluateFunc() {
            return vm[propName];
        }

        const callback = watch[propName];

        new Watcher(vm, evaluateFunc, callback);
    });
}
```

Surprisingly, this is all it takes to make watched property works. Let's test it.

```js
vm.message = "Hello World";
// => new message is Hello World
// => message changed at 10:00:32 GMT+0900 (Japan Standard Time)

vm.message = "Good Night World";
// => new message is Good Night World
// => message changed at 10:00:50 GMT+0900 (Japan Standard Time)
```

Let's take a closer look at the `initWatch`. It first gets the `vm.option.watch` object. In our case, this watch object has one property `message`. It means we are watching `vm.message`. Since we have already established the data proxy in previous steps, `vm.message === vm.options.data.message`. We then create a watcher for the `message` property. Two functions are passed into the watcher. `evaluateFunc` access the a serious of getters and returns the value of `message`. `callback` is our log function here. When we initialize the watcher, the watcher calls `evaluateFunc` once. This is important, because it allows the watcher to access the getter created by `Observer`. When the getter is invoked, it records our watcher as a subscriber.

Whenever `vm.message` changes, it updates all of its subscribers. Our watcher created here also gets udpated. During the update, `callback` (our log function) gets called, and it log the new value and time and in the console.

## Accessing the old value in callback

With the help of `Watcher`, we are able to easily implement watched property. The extra code we did to create `Watcher` seems to pay off. But there is one small thing though, we are only able to print the new value, that is, only the new value is being passed to our log function. In Vue.js, you get both old value, and new value.

```js
//In Vue.js, log function can be
function(newVal, oldVal) {
    //omitted for brevity
}

//In SV, we only get the new value.
function(newVal){
    //omitted for brevity
}
```

We need to figure out a way to get the old value as well. The direct solution would be storing the old value in the watcher, and pass it to the callback function together with the new value.

```js
export default function Watcher(vm, evaluateFunc, callback, options) {
    //omitted for brevity
    this.value = this.get();
    this.oldValue = this.value;
}

Watcher.prototype.run = function(){
    this.value = this.get();
    //pass in the old value
    this.callback.call(this.vm, this.value, this.oldValue);
    //update the old value.
    this.oldValue = this.value;
};
```

## Enhance Watcher class

Currently Watcher class expects a `evaluateFunc` and calls it to get the latest value. `evaluateFunc` needs to be a function for this to work. In our `initWatch` function, we create an anonymous function just to read a property of `vm`:

```js
function evaluateFunc() {
    return vm[propName];
}
```

We can enhance the `Watcher` class so that if `evaluateFunc` is a string, we treat it as the name of a `vm` property and automatically generate a method like the one above. Because `evaluateFunc` is not limitted to a function anymore, we will also rename it to `expOrFunc`.

```js
export default function Watcher(vm, expOrFunc, callback, options) {
    // omitted for brevity 

    if (typeof expOrFunc === 'function') {
        //expOrFunc is a evaluation function, we will just call it later.
        this.getter = expOrFunc
    } else {
        //expOrFunc is an expression, we will treat it as a property of vm.
        this.getter = function(){
            return vm[expOrFunc];
        }
    }

    this.callback = callback;
    this.value = this.get();
    this.oldValue = this.value;
}
```

Now, in `initWatch`, we do not need to create `evaluateFunc` anymore, simply passing the name of the watched property will be enough

## Handling nested property

At this point we are able to watch a property of `vm` like `vm.message`. But we cannot watch a nested property such as `vm.dimensions.height`. With the current code base we will be creating a evaluation function like this:

```js
this.getter = function(){
    return vm[expOrFunc];
}

// if expOrFunc is `dimensions.height` then it will be equivalent to
this.getter = function(){
    return vm['dimensions.height']; // => will return undefined
}
```

To fix this we need to have `vm['dimensions']['height']` instead. There is an existing utility function in Vue.js source code that help us to figure out the property path

```js
const bailRE = /[^\w\.]/
export function parsePath (path) {
  if (bailRE.test(path)) {
    return
  } else {
    path = path.split('.')
    return function (obj) {
      for (let i = 0; i < path.length; i++) {
        if (!obj) return
        obj = obj[path[i]]
      }
      return obj
    }
  }
}

const fnc = parsePath('a.b.c.d');
func(obj); // => same as obj['a']['b']['c']['d'];
```

We will just copy this utility method and use it directly

```js
this.getter = parsePath(expOrFunc);
```

## The imperative vm.$watch API
Vue also allows users to use the imperative API https://vuejs.org/v2/api/#vm-watch. The Vue version allows user to pass an option object to tweak the behavior of the Watcher. We will quickly implement a simple version here, without the option parameter. This api merely creates a watcher under the hood.

```js
vm.$watch = function(eval, update) {
    new Watcher(eval, update);
} 
```

## Summary

OK. We've successfully implemented Watched Property. Most importantly, we have seen that how we can use Watcher to help us update virtually anything, not just components. In next chapter, we will try to implement Computed Property.