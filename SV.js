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

SV.prototype.update = function(newVal){
    const parent = this.value.parentElement;
    parent.insertBefore(newVal, this.value);
    parent.removeChild(this.value);
    this.value = newVal;
};

SV.prototype.mount = function(){
    const newVal = this.evaluate();
    this.update(newVal);
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
    return component.evaluate();
};

//use
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
