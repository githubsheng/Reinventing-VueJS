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

SV.prototype.evaluate = function(){
    return this.options.render.call(this);
};

SV.prototype.patch = function(newVal){
    const parent = this.value.parentElement;
    parent.insertBefore(newVal, this.value);
    parent.removeChild(this.value);
};

SV.prototype.mount = function(){
    const newVal = this.evaluate();
    this.patch(newVal);
};

SV.options = {
    components: Object.create(null)
};

SV.component = function(name, definition) {
    SV.options.components[name] = definition;
};

SV.useComponent = function(name){
    const options = SV.options.components[name];
    options.data = options.data();
    const component = new SV(options);
    return component.evaluate();
};

//use
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
    var c = (str + '').charCodeAt(0)
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

        const name = SV.useComponent("name");

        const div = document.createElement("div");
        div.appendChild(p);
        div.appendChild(name);
        return div;
    }
});
