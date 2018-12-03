import {observe} from "./Observer.js";
import {isReserved} from "./Lang.js";
import Watcher from "./Watcher.js";

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

SV.prototype.evaluate = function(){
    return this.options.render.call(this);
};

SV.prototype.patch = function(newVal){
    const oldVal = this.value;
    if(oldVal) {
        const parent = this.value.parentElement;
        parent.insertBefore(newVal, oldVal);
        parent.removeChild(oldVal);
    }
};

SV.prototype.mount = function(){
    this.watcher = new Watcher(this, this.evaluate, this._update);
    this._update(this.watcher.value);
};

SV.prototype._update = function(newVal){
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
    component.mount();
    return component.value;
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

    observe(acceptedProps);
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
    observe(data);
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

SV.component("dimension", {
    props: ['dimensions'],
    render: function(){
        const p = document.createElement("p");
        p.innerText = `Dimension is: ${this.dimensions.width} x ${this.dimensions.height}`;
        return p;
    }
});

window.vm = new SV({
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