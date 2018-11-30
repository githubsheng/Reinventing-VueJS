import Dependency from "./Dependency";

function SV(options){
    this.options = options;
    initProps(this);
    initData(this);
    initMethods(this);
    const el = document.querySelector(options.el);
    if(el) {
        this.value = el;
        this.update();
    }
}

let componentBeingRendered = null;

SV.prototype.evaluate = function(){
    componentBeingRendered = this;
    const ret = this.options.render.call(this);
    componentBeingRendered = null;
    return ret;
};

SV.prototype.patch = function(newVal){
    const parent = this.value.parentElement;
    parent.insertBefore(newVal, this.value);
    parent.removeChild(this.value);
};

SV.prototype.update = function(){
    const newVal = this.evaluate();
    this.patch(newVal);
    this.value = newVal;
};

SV.options = {
    components: Object.create(null)
};

SV.component = function(name, definition) {
    SV.options.components[name] = definition;
};

SV.useComponent = function(name, input){
    input.attrs = input.props;
    delete input.props;

    let options = SV.options.components[name];

    options = Object.assign(options, input);

    const component = new SV(options);
    const dom = component.evaluate();
    component.value = dom;
    return dom;
};

function initProps(vm) {
    //if vm.el is true, component is root component and we do not need component props. Everything can be in data.
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

    observe(acceptedProps, vm);
}

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
           }
       })
    }

    //call the observe function here.
    observe(data, vm);
}

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

function isReserved (str) {
    const c = (str + '').charCodeAt(0);
    return c === 0x24 || c === 0x5F
}

function isObject (obj) {
    return obj !== null && typeof obj === 'object'
}

function observe(obj, vm) {
    const keys = Object.keys(obj);
    let i = keys.length;
    while(i--) {
        //for every property in `obj`
        const key = keys[i];
        let value = obj[key];
        //if property is reserved, move on
        if(isReserved(key)) return;

        const dep = new Dependency();

        //we want to define getters and setters for this property, on `obj` instance.
        Object.defineProperty(obj, key, {
            configurable: true,
            enumerable: true,
            get: function proxyGetter(){
                //for now, getter simply returns the original value.
                if(Dependency.componentBeingRendered) {
                    dep.addSub(Dependency.componentBeingRendered);
                }

                return value;
            },
            set: function proxySetter(val){
                //update the property value. We are not doing `obj[key] = val` because it results in infinite call loop
                value = val;

                //if the new value is an object, we also need to set up getters and setters on this object as well.
                if(isObject(value))
                    observe(value, vm);

                //we only need to update all the depending components / subscribers.
                dep.notify();
            }
        });

        //if property is an object, we recursively set up getters and setter on this object as well.
        if(isObject(value))
            observe(value, vm);
    }
}


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