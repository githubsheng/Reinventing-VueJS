# Chapter 3: Component properties

In this chapter, we are going to implement component properties (component props for short). We will implement this for none root components. For a root component, `options.data` is enough.

The following example shows the how we want to be able to use component properties. First, in our component definition, we want to be able to explicitly state what kind of properties this component may accept. For example, in the following snippet, we state that this components accepts two props: `firstName` and `lastName`.

```js
SV.component("name", {
    props: ['firstName', 'lastName'],
    render: function(){
        const p = document.createElement("p");
        p.innerText = `${this.firstName} ${this.lastName}`;
        return p;
    }
});
```

Next, we want to be able to assign component properties like this following:

```js
const name = SV.useComponent("name", {
    props: {
        firstName: 'Darth',
        lastName: 'Vadar'
    }
});
```

Finally, we need to be able to access the given component properties through the component instance, just like how we access properties of `options.data` through the component instance. We call it component prop proxy. For example, inside `options.render`, we are accessing `firstName` through `this.firstName`, and in this case, `this` is set to be the component instance.

```js
p.innerText = `${this.firstName} ${this.lastName}`;
```

To implement component props, let's first start by modifying our `SV.useComponent` so that it can pass the extra information to our component constructor `SV`. We will call it component `input` throughout the book.

```js
SV.useComponent = function(name, input){

    input.attrs = input.props;
    delete input.props;

    let options = SV.options.components[name];

    //for now we will just use the simple way to merge the `input` and `options`.
    options = Object.assign(options, input);

    const component = new SV(options);
    return component.evaluate();
};
```

The modified `useComponent` accepts an extra parameter `input`. `input` carries additional information about the new component instance being created. In this case, it carries the value of the component props. Here we simply merge `input` into `options`, so that the SV constructor can just read everything from `options` as it always does. `input` and `options` have no overlapping properties, so it is perfectly fine to merge them. There is one exception though, both of them has `props` properties. But the meaning is different. `options.props` stands for the names of accepted component props, where as `input.props`, as mentioned above, carries the actual component prop values for the new component instance. To avoid conflicts, before we merge, we will rename `input.props` to `input.attrs`.

The `options` now carries the names and values of accepted component props. It makes it easy to implement component prop proxy. The implementation is very similar to data proxy:

```js
function initProps(vm) {
    //if vm.el is true, component is root component and we do not need component props. Everything can be in options.data.
    if(vm.el || !vm.options.props) return;
    let acceptedProps = vm.options.props;
    acceptedProps.forEach(function(propName) {
       Object.defineProperty(vm, propName, {
           configurable: true,
           enumerable: true,
           get: function proxyGetter(){
               return vm.options.attrs[propName];
           },
           set: function proxySetter(val){
               //setting component prop's value is not recommended. So we will ignore this operation.
               //do nothing
               console.log("You are setting a component prop's value. This will have no effect");
           }
       });
    });
}
```

In the constructor, we need to call `initProps`.

```js
function SV(options){
    this.options = options;
    initProps(this);
    initData(this);
    initMethods(this);
    const el = document.querySelector(options.el);
    if(el) {
        this.value = el;
        this.mount();
    }
}
```

In this case, the order of calls matters. `initProps` needs to be called before `initData`. In Vue, a common practice is to define a local data property that uses the component prop as its initial value, as explained here in the official guide of Vue: https://vuejs.org/v2/guide/components-props.html#One-Way-Data-Flow. This means, component prop proxy needs to be established before we process `options.data`. Consider the following example:

```js
SV.component("name", {
    props: ['firstName', 'lastName'],
    data: function() {
        return {
            name: `${this.firstName} ${this.lastName}`
        }
    },
    render: function(){
        const p = document.createElement("p");
        p.innerText = `${this.firstName} ${this.lastName} is Luke's father and Luke's father is ${this.name}`;
        return p;
    }
});
```

`options.data.name`'s initial value is set to be ``${this.firstName} ${this.lastName}``, and `this.firstName` and `this.lastName` are component props, defined in `options.props`.

We have now implemented component props. Let's put everything together and test it:

```js
SV.component("name", {
    props: ['firstName', 'lastName'],
    data: function() {
        return {
            name: `${this.firstName} ${this.lastName}`
        }
    },
    render: function(){
        const p = document.createElement("p");
        p.innerText = `${this.firstName} ${this.lastName} is Luke's father and Luke's father is ${this.name}`;
        return p;
    }
});

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

        const name = SV.useComponent("name", {
            props: {
                firstName: 'Darth',
                lastName: 'Vadar'
            }
        });

        const div = document.createElement("div");
        div.appendChild(p);
        div.appendChild(name);
        return div;
    }
});
```

The resulting html output is

```html
<div>
    <p>Greetings!</p>
    <p>Darth Vadar is Luke's father and Luke's father is Darth Vadar</p>
</div>
```

Great, now, our component can render HTML based on `options.data` and `input.props`.  In this following chapters, we will look at how to update the components if `options.data` and `input.props` change.
