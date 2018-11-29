# Chapter 5: Reacting to component properties changes

In the previous chapter, we briefly mentioned that we are also able to react to changes of component properties, by calling `observe(acceptedProps, vm)` in `initProps`.

In this chapter, we take a closer look at what happens when we update a component property.


## Two ways to update a component property

Before we discuss how a component component update can trigger component updates, let's spend a couple of minutes to review how the component properties themselves gets updated. There are usually two ways we update a componnet update. Let's look at the following code example: a parent component passes some of its data properties to a child component, as component properties. 

```js
SV.component("dimension", {
    props: ['dimensions'],
    render: function(){
        const p = document.createElement("p");
        p.innerText = `Dimension is: ${this.dimensions.width} x ${this.dimensions.height}`;
        return p;
    }
});

let childVm;

SV.useComponent = function(name, input){
    input.attrs = input.props;
    delete input.props;

    let options = SV.options.components[name];

    options = Object.assign(options, input);

    const component = new SV(options);
    //for this chapter's experiment, we assign the created child component to `childVm` in global name space for easy access
    childVm = component;

    const dom = component.evaluate();
    component.value = dom;
    return dom;
};

const parentVm = new SV({
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
```

In the above example, our parent component passes its data property `options.data.dimensions` to the child component. This becomes the child component's component property. Interestingly, we have two pairs of getters and setters for this `dimensions` object. The first pair is defined in parent component. When we create the parent component, the `observe` method call creates the first pair of getter and setter for `dimensions` object. When we create the child component, the `observe` method is called again, during the child component initialization, and this time, it creates the second pair of getter and setters, in child component. In this end, we have:

```js
parentVm.dimensions === childVm.dimensions; // => true

// parentVm.dimensions = {width: '3 meters', height: '4 meters'}; // this is possible, thanks to the setter in parent component

// childVm.dimensions = {width: '3 meters', height: '4 meters'}; // this is also possible, thanks to the setters in child component
```

When we update the `dimensions` via the setter in parent component, the parent component will be updated and rendered. This is because we called the corresponding getter when rendering parent component, and therefore the parent component is recorded as a subscriber. At this time, the child component's rendering has not started yet.

```js
const parentVm = new SV({
	//omitted for brevity
    render: function(){
    	//omitted for brevity
        const dimensions = SV.useComponent("dimension", {
            props: {
            	//getter is accessed here, before child component starts rendering
            	//at this time, the `componentBeingRendered` is still parent component.
            	//therefore, parent component becomes the subscriber.
                dimensions: this.dimensions
            }
        });
        //omitted for brevity
    }
});
```

When the parent component get updated, it will re-create the child component when rendering, and this time, the newly created child component will be passed the updated `dimensions` object as component property.

The second way to update the `dimensions` is through the setter in child component: `childVm.dimensions = {width: '3 meters', height: '4 meters'};`. This time, only the child component will gets updated. The corresponding getter in child component is called when child component is being rendered, therefore, child component is recorded as a subscriber here. 

```js
//omitted for brevity

p.innerText = `Dimension is: ${this.dimensions.width} x ${this.dimensions.height}`;

//omitted for brevity
```

Consequently, when the setter in child component is called, it points `childVm.options.props.dimensions` to `{width: '3 meters', height: '4 meters'}`, and then updates its recorded subscriber -- the child component. However, this will cause data inconsistency as the following code snippet shows, and it is usually undesired.

```js
parentVm.options.data.dimensions === childVm.options.props.dimensions; // => false
```

Vue.js user guide has a very detailed explanation of why this is a bad practices: https://vuejs.org/v2/guide/components-props.html#One-Way-Data-Flow

## unnecessary update

If you read carefully, you may notice that if we use the first way to update component properties, the parent component always get updated. However, in the above example, the dom elements rendered by parent component stays the same -- only those rendered by child components changes. So it seems that parent component update is not a neccessary update. This is true. When a getter is called during a component rendering, the value it returns can be used to render dom elements, or used for other purposes. In our example, it is passed to child component. Strictly speaking, it is only a dependency when used to render some dom elements. However, there is no easy to tell how the returned value is used. To be safe, we can only assume that it is used for rendering dom elements. In practice, this assumption is usually true. 

As we will see in later chapters, the reason a component update can be slow, is that it invovles DOM manipulations. As long as we can avoid unnecessary DOM manipulations, a few extra component updates are harmless. This is where virtual DOM comes into play, and we will discuss it in future chapters.