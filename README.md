Vue's update mechanism is closely linked to how it detects changes. In fact, due to how vue detect changes, it has two update routines. Lets first look at the simpler way.


## First update routine
Let's we have a page that help customers to book hotels. The final rendered html output is like the following:

```html
<div>
    <div>
        <p>9000 yen per night</p>
        <p>You want to stay for 2 nights</p>
    </div>
    <button>Click to update hotel introduction</button>
</div>
```

Although its uncessary in practice, for illustration purpose, lets build two components. The first component is a hotel component that covers the whole outter most div. The second component is a price component that merely renders the the price per night and number of stays.

```js
Vue.component('hotel', {
    data: function(){
        return {
            prices: {
                perNight: 9000,
                stays: 2
            }
        }
    },
    methods: {
        oneMoreNight(){
            this.prices.stays++;
        }
    },
    template: `
        <div>
            <prices v-bind:prices="prices"></prices>
            <button v-on:click="oneMoreNight">One more knight</button>
        </div>
    `
});

Vue.component('prices', {
    props:['prices'],
    template: `
        <div>
            <p>{{prices.perNight}} yen per night</p>
            <p>You want to stay for {{prices.stays}} nights</p>
        </div>
    `
});
```

### How vue track which component needs update
If you haven't read chapter-4, I would recommend you to read it first. Simply put, for each vue component, vue enhance its data with getters and setters. In this case, we have a pair of getter and setter for `data.prices`. A pair of getter and setter for `data.prices.perNight`. And finally, we have a pair of getter and setter for `data.prices.stays`. When we use a part of the data to render a component, the getter track that component, and update the component when the part of data changes.

In the above example, data `prices` is passed down to prices component, and the component access the getters of `perNight` and `stays` to render itself. Now vue knows `perNight` and `stays` are used in rendering prices component, and will try to update the component, when their values change (via setter).

### creating a set of new vdoms
Let's see what actually happened when we click the one more night button.

Firstly, after the hotel is rendered for the first time, conceptually, we have a dom tree like the following.

```
hotel-component-meta-data
    |
    |__hotel-component
            |
            |__div-vdom
                    |
                    |__prices-component-meta-data
                    |            |
                    |            |__prices-component
                    |                    |
                    |                    |__div-vdom
                    |                            |
                    |                            |__p-vdom
                    |                            |    |
                    |                            |    |____text-vdom (perNight: 9000)
                    |                            |
                    |                            |__p-vdom
                    |                                |
                    |                                |____text-vdom (stays: 2)
                    |
                    |__button-vdom
                            |
                            |_____text-vdom
```
When we click the button, `prices.stays` gets updated, and since it is only used in prices component, only the prices component gets updated. Prices component updates itself by first creating new vdoms under it again.

```
prices-component-meta-data
            |
            |__prices-component
                |            |
                |___div-vdom |______div-vdom
                   (old vdom)       (new vdom)
                (children omitted)      |
                                        |
                                        |__p-vdom
                                        |    |
                                        |    |____text-vdom (perNight: 9000)
                                        |
                                        |__p-vdom
                                            |
                                            |____text-vdom (stays: 2)
```

### How does patch function compare and synchronize vdoms
Then vue will patch the old `div-vdom` with the new `div-vdom`. The patch function firstly check if the two vdoms are of the same type. In this case, they are both `div` types. So the patch will update the old vdom, and its real dom, with the new properties and attributes (like ids, class, styles) of the new vdom. Then patch function continues to work on their children. To make it simple, the patch function patches (call itself) the first child of the old vdom with the first child of the new vdom, and then patches the old vdom's second child with the new vdom's second child, and continues. If the new vdom has more childen, patch function creates real dom elements for these children. If the old vdom has more children, these children will gets destroyed, along with their real doms. In practice though, rather than comparing the first with the first, and second with the second... vue does some optimizations for some common seen senarios, I would recommend to take a look at the `updateChildren` function in `patch.js`.

At the end of the `patch` function. The old vdoms will be syncrhonized from the new vdoms. The new vdoms then becomes useless and removed.

### Key difference from React
This is the first vue update routine. As you can see it is more elegant and potentially more effcient than React. Unless we write the `shouldComponentUpdate` method, react always need to construct the whole vdom of hotel component, and potentially compare all the vdoms to find out which vdom needs update. However, vue knows from the beginning that it only needs to compare the vdoms of the prices component. The differences may not be huge here. But imagine if the hotel component holds a very complex data and different parts of it are passed to hundreds of other components, then the difference can be huge.

## Second update routine
Now lets talk about the second update routine. This is a lot of complex and takes some time to explain. Lets continue with the above example, but this time, lets change the `oneMoreNight` method a little:

```js
    methods: {
        oneMoreNight(){
            this.prices = {
                perNight: 9000,
                stays: 2
            };
        }
    }
```

When the `oneMoreNight` method is called, vue is not able to update the prices component via the first routine we just described.

Things turn very different here. When we render all the components for the first time, the getter of `pricies` actually tracks the hotel component, rather than the intro component. This is because the hotel component access `prices`'s getter, get the object value and then pass the value to the prices component. So really, it is the hotel component that uses the getter of `prices`. Therefore, when we change the value of `prices`, its setter will try to ask the hotel component to update itself.

So does the hotel component creates the entire vdom tree and do we ending up comparing every single vdoms? The answer is no. Vue knows which components under hotel component needs update. That is, vue can identify that prices component needs update, but other component (if there is any) do not need update. Therefore, vue  only creates the new vdoms of the intro component, and compare it with the old vdoms. And finally, vue does all these magic without asking us to write any `shouldComponentUpdate` method. Let's see what actually happens.

Let's review the existing vdoms before update

```
hotel-component-meta-data
    |
    |__hotel-component
            |
            |__div-vdom
                    |
                    |__prices-component-meta-data
                    |            |
                    |            |__prices-component
                    |                    |
                    |                    |__div-vdom
                    |                            |
                    |                            |__p-vdom
                    |                            |    |
                    |                            |    |____text-vdom (perNight: 9000)
                    |                            |
                    |                            |__p-vdom
                    |                                |
                    |                                |____text-vdom (stays: 2)
                    |
                    |__button-vdom
                            |
                            |_____text-vdom
```

### component meta data
There is one thing worth mentioning first here. You may have noticed, there is "meta-data". A component meta contains the characterstics of a component. It typically stores these following information:
1. the component type
2. its properties
3. its data.
Compared with a fully fledged component instance, the meta data is much more lightway and much faster to create.

### partial vdom tree and shallow comparision
So knowing what meta data is, let's see what happens when hotel component updates itself. Hotel component will first tries to create a set of new vdoms. However, it does not creates all of the vdoms under it. Instead, it creates something like the following:

```
hotel-component-meta-data
    |
    |______________hotel-component
                    |        |
                    |        |___div-vdom
                    |            (old vdoms)
                    |            (children omitted for brevity)
                    |
                    |
                    |___div-vdom
                        (new vdoms)
                            |
                            |__prices-component-meta-data
                            |
                            |__button-vdom (oneMoreNight)
                                    |
                                    |___text-vdom

```
Notice that the hotel component still keeps the old vdoms, as vue needs to compare the old with the new.

As you can see, the newly created vdom is not complete vdom tree like the old one. Preciously speaking, vue only creates the meta data for components. Then vue calls the `patch` function. The `patch` function first compares the old div vdom and new div vdom. In our case, the two div vdoms are the same, so vue move on to compare their children.

The first child for both div vdoms are prices component meta data. When vue compare the old prices component meta data (old meta for short) and the new meta data, it compares the following:
1. the component type
2. its properties

For each of the above, it does a fast, shallow comparision. This shallow comparision detects that the component property `prices`, passed down from hotel component, are two different objects. `patch` then determines that the price component will need a update, and does the following:
1. get the prices component instance linked to the old meta data
2. reuse this component, but updates its properties and data via
3. put the price component into the update queue, and then move on to compare the button vdoms.


### after the above three steps, this is how the vdom tree look like:
```
hotel-component-meta-data
    |
    |______________hotel-component
                    |        |
                    |        |___div-vdom
                    |            (old vdoms)
                    |            (children omitted for brevity)
                    |
                    |
                    |__div-vdom
                      (new vdoms)
                        |
                        |
                        |__prices-component-meta-data
                        |            |
                        |            |___prices-component
                        |                (this is the same instance used in the old vdoms)
                        |                (this component's properties are updated via patch function)
                        |                (this component now sits in update queue, will be updated at next tick)
                        |                    |                        |
                        |                    |__no new vdoms            |__old vdoms
                        |
                        |
                        |__button-vdom (oneMoreNight)
                                |
                                |___text-vdom

```

After `patch` move over the prices component. It continues to compare other vdoms. This is the same as described in the first routine. When `patch` finishes, the old vdoms will be synced from the new vdoms. The new vdoms then becomes useless, and is removed.

### after the patch function finishes
```
hotel-component-meta-data
    |
    |______________hotel-component
                    |
                    |
                    |
                    |__div-vdom
                      (synced from the new vdoms, update to date now)
                        |
                        |
                        |__prices-component-meta-data
                        |            |
                        |            |___prices-component
                        |                (this component's properties are updated via patch function)
                        |                (this component now sits in update queue, will be updated at next tick)
                        |                    |                        |
                        |                    |__no new vdoms            |__old vdoms
                        |
                        |
                        |__button-vdom (oneMoreNight)
                                |
                                |___text-vdom

```


There are two important things to remember and understand here:

### the patch function does not creates new vdoms
The `patch` function finds out that the price component needs update. It then updates the component instance's properties, but it does not attempt to create new vdoms and go on to compare the new vdoms and the old. At the next tick, vue will get the price component from the update queue, calls the render method of the price component. This creates a new set of vdoms, using the updated properties. Vue then calls the `patch` function to compare the new and old vdoms. This is important to understand, otherwise you will be confused when reading the source code.

### the patch function only does shallow comparision
For all component properties, vue simply checks if they are the same using shallow comparision. In our case, the component properties `prices` are two different objects, and vue is able to detect the difference. You may ask, what happens if a nested property changes. For example, if `prices` remains the same object, but `prices.stays` is changed. In this case, the shallow comparision does not work, and it seems vue is not able to tell that the component needs an update. But as we discussed earlier, `prices.stays` changes triggers the first update rountine, and vue is able to update as expected.

After the prices component is put into the update queue, at next tick, vue will try to update prices component. The prices component first creates a set of new vdoms, and the `patch` function compares the old and new vdoms, and decides how to update the actual dom.

At next tick, prices component creates a new set of vdoms, and run `patch` to compare the old and new vdoms, eventually synchronizing the old from the new. This is the same as described in routine 1.

```
hotel-component-meta-data
    |
    |______________hotel-component
                    |
                    |
                    |
                    |__div-vdom
                      (synced from the new vdoms, update to date now)
                        |
                        |
                        |__prices-component-meta-data
                        |            |
                        |            |___prices-component
                        |                (patch function will compare the old and new vdoms)
                        |                    |                        |
                        |                    |__new vdoms            |__old vdoms
                        |
                        |
                        |__button-vdom (oneMoreNight)
                                |
                                |___text-vdom
```








