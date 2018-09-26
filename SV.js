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
    this.value = newVal;
};

SV.prototype.mount = function(){
    const newVal = this.evaluate();
    this.update(newVal);
};

SV.


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
    }
});
