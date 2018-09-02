function SV(options){
    const content = options.render.call(options.data);
    const el = document.querySelector(options.el);
    el.innerHTML = "";
    el.appendChild(content);
}


