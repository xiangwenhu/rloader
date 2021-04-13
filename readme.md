## 资源加载器

### demo
演示地址：<a href="https://xiangwenhu.github.io/rloader/" target="_blank">r-loader演示</a> 
```js
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
}];


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


```
