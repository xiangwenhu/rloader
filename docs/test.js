const resourcesInfo = [{
    pre: ["promise"],
    key: "axios",
    url: "https://cdnjs.cloudflare.com/ajax/libs/axios/0.21.1/axios.min.js"
},{
    key: "mqtt",
    url: "https://cdnjs.cloudflare.com/ajax/libs/mqtt/4.2.6/mqtt.min.js"
},{
    key: "lottie",
    url: "https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.7.8/lottie.min.js"
},{
    key: "flv",
    url: "https://cdnjs.cloudflare.com/ajax/libs/flv.js/1.5.0/flv.min.js"
},
{
    key: "promise",
    url: "https://cdnjs.cloudflare.com/ajax/libs/promise-polyfill/8.2.0/polyfill.min.js"
},{
    pre: "react",
    key: "react-dom",
    url: "https://cdnjs.cloudflare.com/ajax/libs/react-dom/17.0.2/umd/react-dom.production.min.js"
},{
    url: "https://cdnjs.cloudflare.com/ajax/libs/react/17.0.2/umd/react.production.min.js",
    key: "react"
}, {
    key: "react-router",
    pre: ["react", "react-dom"],
    url: "https://cdnjs.cloudflare.com/ajax/libs/react-router/5.2.0/react-router.min.js"
}, {
    key: "redux",
    pre: ["react", "react-dom"],
    url: "https://cdnjs.cloudflare.com/ajax/libs/redux/4.0.5/redux.min.js"
}, {
    key: "react-redux",
    pre: ["react", "react-dom", "redux"],
    url: "https://cdnjs.cloudflare.com/ajax/libs/react-redux/7.2.3/react-redux.min.js"
}];

const messager = {
    container: document.getElementById("messages"),
    append(){
        const msgStr =  Array.from(arguments).map(msg=> JSON.stringify(msg)).join("\t");
        const el = document.createElement("div");
        el.innerHTML = `<div>${msgStr}</div>`;
        this.container.appendChild(el);
    },
    clear(){
        this.container.innerHTML = "";
    }
}

function addEvent(selector, name , fn, options = false){
   const el =  document.querySelector(selector);
   if(!el){
    return;
   }
   el.addEventListener(name, fn, options);
}

function listenConsole(){

    ["log", "info", "warn", "error"].forEach(m=>{
        const originM = console[m];

        console[m] = function (){
            messager.append.apply(messager, arguments);
            originM.apply(this, arguments)
        }
    })
}

listenConsole();

let startTime;

const rl = new ResourceLoader(resourcesInfo);

rl.on("progress", (progress, info)=>{
    console.log("progress", progress,  info);
});

rl.on("loaded", (datas)=>{
    console.log("loaded event", datas);    
    console.log("total time:", Date.now() - startTime)
})

rl.on("error", (error, info)=>{
    console.log("error event",error, info);
})

addEvent("#btn-load", "click", ()=>{
    messager.clear();
    startTime = Date.now();
    rl.reset();
    rl.startLoad();
});


addEvent("#btn-clear", "click", ()=>{
    window.idb.clear();
});




