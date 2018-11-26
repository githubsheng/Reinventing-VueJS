# Chapter 2: Data proxy and method binding.

## what is data proxy

When we read Vue’s developer guide, we can find the following interesting feature of Vue

Following example is borrowed directly from Vue's official guide:

```js
// Our data object
var data = { a: 1 }

// The object is added to a Vue instance
var vm = new Vue({
  data: data
})

// Getting the property on the instance
// returns the one from the original data
vm.a == data.a // => true

// Setting the property on the instance
// also affects the original data
vm.a = 2
data.a // => 2

// ... and vice-versa
data.a = 3
vm.a // => 3
```

There is no term to describe this feature in the guide, here, for convenience, we will just call it data proxy. It turns out this is one of the essential feature of Vue and it is the basis of many other features. 

## Implementing data proxy

The basic plan is to create getters and setters and use them as the proxy to the underlying data object.
For example, in the above example, when we accessing `vm.a`, we are actually accessing the getter method of `vm.a`. And this getter method will call `data.a` and returns its value.

```js
get a(){
    return this.options.data.a;
},

set a(val) {
    this.options.data.a = val;
}
```    


This does the trick for `a` property. We need to create getters and setters for all properties of `options.data`.  We can begin by iterating all properties on `options.data` object, and create a corresponding getters and setters in our component instance `vm`. 

```js
function initData(vm){
    let data = vm.options.data;
    if(!data) return;
    if(typeof data === 'function') {
        data = data();
    }
    const keys = Object.keys(data);
    let i = keys.length;
    while(i--) {
       const key = keys[i];
       /*
        for each property in `options.data`,
        we create a pair of getters and setters on our component
        instance `vm`.
        */
       Object.defineProperty(vm, key, {
           configurable: true,
           enumerable: true,
           get: function proxyGetter(){
                return vm.options.data[key];
           },
           set: function proxySetter(val){
               vm.options.data[key] = val;
           }
       })
    }
}
```

We will also modify our SV constructor slightly so that it calls `initData` in the beginning.

```js
function SV(options){
    this.options = options;
    initData(this);
    const el = document.querySelector(options.el);
    if(el) {
        this.value = el;
        this.mount();
    }
}
```

There is one thing to notice though, we should not override object's reserved properties, such as `__proto__`. Here we will simply copy the utility function from the original Vue source code. Given a property name, it checks if it is a reserved property: 

```js
function isReserved (str) {
  var c = (str + '').charCodeAt(0)
  return c === 0x24 || c === 0x5F
}
```

Let's put it into work:

```js
function initData(vm){
    let data = vm.options.data;
    if(!data) return;
    if(typeof data === 'function') {
        data = data();
    }
    const keys = Object.keys(data);
    let i = keys.length;
    while(i--) {
       const key = keys[i];
       if(isReserved(key)) continue;
       /*
        for each property in `options.data`,
        we create a pair of getters and setters on our component
        instance `vm`.
        */
       Object.defineProperty(vm, key, {
           configurable: true,
           enumerable: true,
           get: function proxyGetter(){
                return vm.options.data[key];
           },
           set: function proxySetter(val){
               vm.options.data[key] = val;
           }
       })
    }
}
```

We have completed data proxy implementation, let's put it to test:

```js
const vm = new SV({
    el: '#app',
    data: {
        message: 'Greetings!'
    },
    render: function(){
        const p = document.createElement("p");
        p.innerText = this.message;

        const name = SV.useComponent("name");

        const div = document.createElement("div");
        div.appendChild(p);
        div.appendChild(name);
        return div;
    }
});

vm.options.data.message // => "Greetings!"
vm.message // => "Greetings!"
vm.message = "Good morning!";
vm.options.data.message // => "Good morning!"
```

Now that we are able to read/write data properties through the component instance, we can also update our `evaluate` function:

```js
SV.prototype.evaluate = function(){
    return this.options.render.call(this);
};
```

Previously, we bind the `options.render` function to `options.data`. Since component instance now has getters and setters, and they will access the underlying property of `options.data`, we can just bind the `options.render` to the component instance `this`.

We have completely the data proxy implementation, now let's look at method binding. 

If we define a method in `options.methods`, we can call the method on the component instance, for example:

#code 2.1

```js
const vm = new SV({
    el: '#app',
    data: {
        message: 'Greetings!'
    },
    methods: {
        printMessage: function(){
            console.log(this.message);
        }
    },
    render: function(){
        const p = document.createElement("p");
        p.innerText = this.message;
        p.addEventListener("click", this.printMessage);

        const name = SV.useComponent("name");

        const div = document.createElement("div");
        div.appendChild(p);
        div.appendChild(name);
        return div;
    }
});
```

When we call `vm.printMessage()`, it should print `Greetings!` in the console. When we click on the rendered message, it should also print `Greetings!` in the console.

Our basic plan is roughly the same as our plan for data proxy implementation. We will iterate through all methods defined in `options.methods`, and create a corresponding method on sv instance. The created method does nothing but simply delegate the call to the original method.

```js
function initMethods(vm) {
    const methods = vm.options.methods;
    if(methods) {
        for(let methodName in methods) {
            const method = methods[methodName];
            vm[methodName] = function(){
                return method.apply(vm, arguments);
            }
        }
    }
}
```

It is worth noticing that we need to bind the method to the component instance, so that in the method, `this` correctly refers to the component instance. In the above example, `this.message` will be `vm.message`. Further more, `vm.message` will call its getter, and return `options.data.message`. 

With our `initMethods` defined, we need to call it in the SV constructor:

```js
function SV(options){
    this.options = options;
    initData(this);
    initMethods(this);
    const el = document.querySelector(options.el);
    if(el) {
        this.value = el;
        this.mount();
    }
}
```

We have completed both the implementation of data proxy and method binding. These two features will be frequently used in the coming chapters. In the next chapter, we will look at component properties (component props for short). Component props behaves very similarly as `options.data`. With the understanding of data proxy and method binding, it is not difficult to implement component props.

