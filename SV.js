function SV(options){
    this.options = options;
    const el = document.querySelector(options.el);
    if(el) {
        this.value = el;
        this.mount();
    }
}

SV.prototype.evaluate = function(){
    return this.options.render.call(this.options.data);
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
