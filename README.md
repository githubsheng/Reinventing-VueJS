## Definitions

Before we start any implementation, we need to make a few concepts clear here first, to make further discussions a little bit easier:

If a component uses a `options.data` property for rendering, we say that this component “depends on” this property. And this property is a “dependency” of the component, this component is a “depending component”, or “subscriber” of this property. When this dependency changes, our component needs to be re-rendered. We say this component needs “update”. Do not confuse this "update" with `SV.prototype.update`. The latter is the method we use to update DOM tree

Consider the following component, property `title`, `author` and `content` are used for rendering, they are this component’s dependencies. And we need to update this component if any of them changes. On the other hand, `bookId` and `authorId` are not used for rendering, and if they change, we do not need to update the component again. Therefore, `bookId` and `authorId` are not dependencies of this component. 

```js
const vm = new SV({
    el: '#app',
    data: {
        bookId: '000001',
        authorId: '000007',
        title: 'Quantum Physics For Dummies',
        author: 'Steven Holzner',
        content: 'It is complicated.'
    },
    render: function(){
        const title = document.createElement("p");
        title.innerText = "Book name: " + this.title;

        const author = document.createElement("p");
        author.innerText = "Author: " + this.author;

        const content = document.createElement("p");
        content.innerText = "Content: " + this.content;

        const div = document.createElement("div");
        div.appendChild(title);
        div.appendChild(author);
        div.appendChild(content);

        return div;
    }
});
```

## html output of the above component
```html
<div>
    <p>Book name: Quantum Physics For Dummies</p>
    <p>Author: Steven Holzner</p>
    <p>Content: It is complicated.</p>
</div>
```

In later chapters, we will see that `options.data` properties are not the only possible dependencies. Other things such as computed properties, component props can also be dependencies. But we will first discuss `options.data` properties in this chapter, as they most commonly seen dependencies.

## First attempt to get component updated automatically

For a single component application, the simplest way to make sure the rendered HTML or DOM elements stay in synchronized with `options.data`, is to update the component every time any `options.data` property changes. Conveniently, we already have setters for all the properties. When a setter gets called, it means the corresponding `options.data` property is being changed.  Knowing this, we can update the component when the setter is called.

Here is the modified `initData` function. We only changed the setter function.

```js
function initData(vm){
    if(!vm.options.data) return;
    if(typeof vm.options.data === 'function')
        vm.options.data = vm.options.data.call(vm);
    const data = vm.options.data;
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
                return data[key];
           },
           set: function proxySetter(val){
               data[key] = val;
               const newDom = vm.evaluate();
               vm.patch(newDom);
           }
       })
    }
}
```

We can quickly test our first component in this chapter.

```js
//create the root component
vm.title = "Ten ways to save money";
```

```html
<!-- rendered html -->
<div>
    <p>Book name: Ten ways to save money</p>
    <p>Author: Steven Holzner</p>
    <p>Content: It is complicated.</p>
</div>
```

```js
vm.author = "Me";
```

```html
<!-- rendered html -->
<div>
    <p>Book name: Ten ways to save money</p>
    <p>Author: Me</p>
    <p>Content: It is complicated.</p>
</div>
```

## Reacting to changes of nested properties
Everything looks OK. But if we modify the code and play around it a little bit, we can quickly find that, sometimes our component isn't updated when we expect it to be updated, and sometimes the component gets updated when it does not need to be updated.

Here is an example in which the component is not getting updated properly. We will change our root component slightly to illustrate the problem:

```js
const vm = new SV({
    el: '#app',
    data: {
        bookId: '000001',
        author: {
            id: '000007',
            name: 'Steven Holzner'
        },
        title: 'Quantum Physics For Dummies',
        content: 'It is complicated.'
    },
    render: function(){
        const title = document.createElement("p");
        title.innerText = "Book name: " + this.title;

        const author = document.createElement("p");
        author.innerText = "Author: " + this.author.name;

        const content = document.createElement("p");
        content.innerText = "Content: " + this.content;

        const div = document.createElement("div");
        div.appendChild(title);
        div.appendChild(author);
        div.appendChild(content);

        return div;
    }
});
```

Now if we execute `vm.author.name = 'Me'`, the component stays the same. While we have setter for `vm.author`, we don't have one for `vm.author.name`, therefore when `vm.author.name` is changed, no setter is there to tell us we need an update. Essentially, we are able to react to the changes of  `vm.options.data`’s properties, but not able to react to changes of its nested properties.

To solve this immediate issue, we need to be examine all nested properties and create setters for them, just like what we do for the “direct properties” of `vm.options.data`.  We can create a `observe` function to do the job. Given an object, this function walk through all nested properties of the object, and adds a pair of getter and setter for each property. In the setter, it implants the component update logic. If a property is an object itself, the function will recursively calls itself and pass the object property as the parameter, eventually adding getters and setters for all properties (nested or not).

```js
function observe(obj, vm) {
    const keys = Object.keys(obj);
    let i = keys.length;
    while(i--) {
        //for every property in `obj`
        const key = keys[i];
        let value = obj[key];
        //if property is reserved, move on
        if(isReserved(key)) continue;

        //we want to define getters and setters for this property, on `obj` instance.
        Object.defineProperty(obj, key, {
            configurable: true,
            enumerable: true,
            get: function proxyGetter(){
                //for now, getter simply returns the original value.
                return value;
            },
            set: function proxySetter(val){
                //update the property value. We are not doing `obj[key] = val` because it results in infinite call loop
                value = val;

                //if the new value is an object, we also need to set up getters and setters on this object as well.
                if(isObject(value))
                    observe(value, vm);

                //when the property gets updated, we will also update the component.
                const newDom = vm.evaluate();
                vm.patch(newDom);
            }
        });

        //if property is an object, we recursively set up getters and setter on this object as well.
        if(isObject(value))
            observe(value, vm);
    }
}
```

Previously, in our data proxy setter, we added component update logic. Since now the `observe` function will handle this bit, we can remove the component update logic in the data proxy setter. 

```js
function initData(vm){
    //...omitted for brevity.
    while(i--) {
       const key = keys[i];
       if(isReserved(key)) continue;
       Object.defineProperty(vm, key, {
           configurable: true,
           enumerable: true,
           get: function proxyGetter(){
                return data[key];
           },
           set: function proxySetter(val) {
               //component update logic removed!
               data[key] = val;
           }
       })
    }

    //call the observe function here.
    observe(data, vm);
}
```

With all these changes, there seem to be a lot of getters and setters in our logic. Maybe we can take a break and figure out what each of them do. Given the previous root component, let's take a look at two examples here.

If we access `vm.content`, conceptually, it is the same as the following:

```js
const data = {
    _content: "It is complicated",
    get content(){
        return this._content;
    }
};

const vm = {
    data,
    get content(){
        return data.content;
    }
};

vm.content // => "It is complicated"
```

In the above code, `get content` of `vm` is called, it in turn calls `get content` of `data`. `get content` of `data` then returns the real value of content.

## Examples of unnecessary updates

The second issue is, we have unnecessary component updates. Let’s quickly revisit our book example

```js
const vm = new SV({
    el: '#app',
    data: {
        bookId: '000001',
        authorId: '000007',
        title: 'Quantum Physics For Dummies',
        author: 'Steven Holzner',
        content: 'It is complicated.'
    },
    render: function(){
        //omitted for brevity
    }
});

vm.authorId = '000008'; // => will trigger an update
```

## html output of the above component before update
```html
<div>
    <p>Book name: Quantum Physics For Dummies</p>
    <p>Author: Steven Holzner</p>
    <p>Content: It is complicated.</p>
</div>
```
## html output of the above component after update
```html
<div>
    <p>Book name: Quantum Physics For Dummies</p>
    <p>Author: Steven Holzner</p>
    <p>Content: It is complicated.</p>
</div>
```

If we call `vm.authorId = '000008'`, our component also gets updated. In this case, `vm.authorId ` is not a dependency of the component, and its changes does not affect the rendered HTML DOM elements, therefore, this component update is unnecessary. In real application, we can have hundreds of `options.data` properties like `vm.authorId`, and this means a lot of useless updates.

Let's look at another example, and it shows a different form of unwanted component update. This time we have a parent component and a child component.

```js
SV.component("dimension", {
    props: ['dimensions'],
    render: function(){
        const p = document.createElement("p");
        p.innerText = `Dimension is: ${this.dimensions.width} x ${this.dimensions.height}`;
        return p;
    }
});

const vm = new SV({
    el: '#app',
    data: {
        message: 'Great bargain!',
        dimensions: {
            width: '6 meters',
            height: '2 meters'
        }
    },
    render: function(){
        const salesMessage = document.createElement("p");
        salesMessage.innerText = this.message;

        const dimensions = SV.useComponent("dimension", {
            props: {
                dimensions: this.dimensions
            }
        });

        const div = document.createElement("div");
        div.appendChild(salesMessage);
        div.appendChild(dimensions);
        return div;
    }
});

vm.dimensions.height = '3 meters' // => will update the parent component, indirectly updates the 'dimention' child component.

```

Consider the above example, `options.data.dimensions` is passed to child components. If we change `options.data.dimensions.height`, the parent component gets updated, and when the parent component update itself, it also render its child component again, indirectly updating the child component. Although the outcome is correct (child component gets updated), only the related the child component needs update. Our parent component do not need a update in this case, therefore the parent update is a waste. The issue becomes even more obvious when our parent component has other child components, when we unnecessarily update the parent component, we also indirectly updates all its child components, and these updates are also not needed. 

In our current implementation, all properties' setter method will cause the component to render again. That means, even if a property is not a dependency, we still update the component when it changes. 

In our first example, `vm.authorId` isn’t a dependency of our root SV component, but its changes causes the root component to update. In our second example, `options.data.dimensions.height` isn’t a dependency of the parent component, but its changes causes the parent component to update.

This is not ideal. And it is particularly bad in real world Vue.js application, where you may have hundreds of properties, hundreds of components, and very frequently data changes. We need to avoid unnecessary component update. And to do, we need to answer the following question:

What components depend on a specific `options.data` property?

Given a `options.data` property, or nested property, we should update and only update those components that depend on it. Now our issue reduces to finding the depending components. This is when our getter methods come to play. When a `options.data` property is used for rendering, its getter methods will get called, and inside the getter method, we can track and record which component uses this property for rendering. This way, we can easily find out all the depending components (subscribers)

Firstly, we need to know which component is being rendered. Since at any time, only one component can be rendered (js does not support multi-thread), we can have a global variable and point it to the component right before the component gets rendered.

```js
let componentBeingRendered = null;

SV.prototype.evaluate = function(){
    componentBeingRendered = this;
    const ret = this.options.render.call(this);
    componentBeingRendered = null;
    return ret;
};
```

Then, in the getters we created for all the `options.data` properties, we can be informed that this property is used (getter called) during the rendering of a component.

```js

```



Also, we need to update our setters accordingly: 

Todo: insert code: inside setter, only render a component if the component depends on this property. 

In this chapter, we made a big step towards “reactive”. In the next chapter, we will reorganize our code slightly to align with the code structure of Vue.js source code.