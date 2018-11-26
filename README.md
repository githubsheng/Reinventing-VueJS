# Chapter 1: SimplifiedVue and its first component

## Simplified Vue

Throughout this book we will be implementing a framework called SimplifiedVue, or SV for short. 
By implementing this framework step by step, we hope to encounter, and most importantly, solve a lot of similar problems the original authors had when they were implementing the original Vue framework. This will surely help us gain a lot of insight of Vue's source code. We should have no problem understanding the original Vue source code, if we have implemented something similar.

Our implementation starts from the very basic, very simple features. Eventually, SV will have all the core features and frequently features of Vue. You can find the source code of SV in https://github.com/githubsheng/SV. This repository has multiple branches, and each branch corresponds to a chapter. For example, branch chapter-one will contains the source code in chapter one.

## Our first SV component

So we are going to implement our own Vue now. It is not going to be easy, but we will take it step by step. Let's start by implementing a single component SV application. We want to be able to use it like the following example:

### html

```html
<div id="app"></div>
```

#### js

```js
var vm = new SV({
    el: '#app',
    data: {
        message: 'Hello World!'
    },
    render: function(){
        const p = document.createElement("p");
        p.innerText = this.message;
        return p;
    }
});
```

### output html

```html
<p>Hello World!</p>
```

Let's take a look at `SV` constructor. Here is its source code. 

```js
function SV(options){
    this.options = options;
    const newDOM = options.render.call(options.data);
    const existingDOM = document.querySelector(options.el);
    const parent = el.parentElement;
    parent.insertBefore(newDOM, existingDOM);
    parent.removeChild(existingDOM);
}
```

What does this constructor do? It receives one parameter `options`. The `options` parameter has a `data` property and a `render` method. Our SV function then binds `options.data` to `render` function and calls it. This will result in a DOM element. The DOM element is then used to replace the existing DOM element whose selector match `options.el`.

Although the current implementation is yet very simple, there are two processes here that are worth mentioning:
1. evaluation: the process of evaluating the new DOM element. In our case, `const newDOM = options.render.call(options.data);` evaluates the new DOM element.
2. update: the process of replacing/updating the old DOM element in the DOM tree with the new one. The last 3 lines in the constructor does the updating.
We will refer to these two processes many times in the future. There are two other concepts and we need to make them clear in the beginning:
1. render: this concept is different `options.render`. When we say we want to render a component, we usually mean the processing of evaluation and update. `options.render`, is used to specify how we want to generate the DOM elements. If we want to refer to `options.render` in this book, we will always use `options.render` instead of `render`.
2. mount: similar to render.

We've defined 4 concepts. Next, let's refactor our code accordingly:

```js
function SV(options){
    this.options = options;
    this.value = document.querySelector(options.el);
    this.mount();
}

SV.prototype.evaluate = function(){
    return this.options.render.call(this.options.data);
};

SV.prototype.update = function(newVal){
    const parent = this.value.parentElement;
    parent.insertBefore(newVal, this.value);
    parent.removeChild(this.value);
    // the latest DOM element will be stored as `this.value`.
    this.value = newVal;
};

SV.prototype.mount = function(){
    const newVal = this.evaluate();
    this.update(newVal);
};
```

So far, we are able to render our single component application, and it is used in a similar way like Vue. For instance, this is how we can achieve the same result by Vue:

### html

```html
<div id="app"></div>
```

### js

```js
var vm = new Vue({
    el: '#app',
    data: {
        message: 'Hello World!'
    },
    render: function (createElement) {
        return createElement(
            "p",
            [this.message]
        )
    }
});
```

## Child Component

We've had our single component application, now we are going to look at child component, or nested component. For now, we aim to have simple child components. We want to be able to use child components like this:

```js
SV.component("name", {
    data: function(){
        return {
            firstName: "Darth",
            lastName: "Vader"
        }
    },
    render: function(){
        const p = document.createElement("p");
        p.innerText = `${this.firstName} ${this.lastName}`;
        return p;
    }
});

var vm = new SV({
    el: '#app',
    data: {
        message: 'Greetings!'
    },
    render: function(){
        const p = document.createElement("p");
        p.innerText = this.message;

        const name = useComponent("name");

        const div = document.createElement("div");
        div.appendChild(p);
        div.appendChild(name);
        return div;
    }
});
```

As you can see, it is quite similar to how we use components in Vue.js

Our implementation consists mainly two parts:
1. We need to be able to register a component by name. This is equivalent to component global registration in Vue.js
2. We need to be able to find the component by its name, and use it to render HTML.

The registration part is relatively straight forward as shown in the below code snippet. When registering a component, we take two parameters: 
1. the component name
2. the component definition

We can use a map for storage here. The key name is the component name, and the value is the definition. When we need to create an instance of this component, we can look for the definition through name, and then create a new component instance based on the definition.

```js
SV.options = {
    components: Object.create(null)
};

SV.component = function(name, definition) {
    SV.options.components[name] = definition;
};
```

To use a component, we will create an instance of this component, and evaluates its DOM element. The evaluated DOM element will be returned and used in the parent's rendering process.

```js
SV.useComponent = function(name){
    const options = SV.options.components[name];
    options.data = options.data();
    const component = new SV(options);
    return component.evaluate();
};
```

There are several things to notice here:
1. we will reuse the SV constructor we defined for single component application. 
2. the component definition is used as the component options.
3. we call `options.data()` to obtain a stand alone copy for each component instance, as we do in Vue.
We also need to modify our SV constructor slightly. Currently, it will call `mount` at the end, inserting the evaluated DOM element into DOM tree. In our case, we want to return the DOM element and let the parent component decides how to, when to and where to insert the DOM element. 

If `options.el` exists, then it means this component will replace the target element (specified by `options.el` selector) with its evaluated DOM element. Therefore, it makes sense to mount the component automatically. If `options.el` does not exists, then it is unknown where this component is to be inserted in the DOM tree. The place can be anywhere, so we not call `mount` in the component initialization phase.

```js
function SV(options){
    this.options = options;
    const el = document.querySelector(options.el);
    if(el) {
        this.value = el;
        this.mount();
    }
}
```

Let’s run the code and see what we have so far.

```js
<div>
    <p>Greetings!</p>
    <p>Darth Vader</p>
</div>
```

So far, in this chapter. We are able to define our own SV components, and render some HTML. Our SV framework still lacks a lot of features offered by Vue. But this is a very good start. We will gradually enhance our SV framework to include all core features of Vue. In the next chapter, we will discuss data proxy and method binding.
