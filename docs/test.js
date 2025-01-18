const resourcesInfo = [
    {
        key: "mqtt",
        url: "https://cdnjs.cloudflare.com/ajax/libs/mqtt/5.10.3/mqtt.min.js",
        ver: "4.2.8"
    },
    {
        pre: ["promise"],
        key: "axios",
        url: "https://cdnjs.cloudflare.com/ajax/libs/axios/1.7.8/axios.min.js",
        ver: "0.21.1"
    }
    , {
        key: "lottie",
        url: "https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"
    }, {
        key: "flv",
        url: "https://cdnjs.cloudflare.com/ajax/libs/flv.js/1.6.2/flv.min.js"
    },
    {
        key: "promise",
        url: "https://cdnjs.cloudflare.com/ajax/libs/es6-promise/4.2.8/es6-promise.min.js"
    }, {
        key: "react-dom",
        url: "https://cdnjs.cloudflare.com/ajax/libs/react-dom/19.0.0/cjs/react-dom.production.min.js"
    }, {
        pre: "react-dom",
        url: "https://cdnjs.cloudflare.com/ajax/libs/react/19.0.0/cjs/react.production.min.js",
        key: "react"
    }, {
        key: "react-router",
        pre: ["react", "react-dom"],
        url: "https://cdnjs.cloudflare.com/ajax/libs/react-router/6.28.1/react-router.production.min.js"
    }, {
        key: "redux",
        pre: ["react", "react-dom"],
        url: "https://cdnjs.cloudflare.com/ajax/libs/redux/5.0.1/redux.legacy-esm.js"
    }, {
        key: "react-redux",
        pre: ["react", "react-dom", "redux"],
        url: "https://cdnjs.cloudflare.com/ajax/libs/react-redux/9.2.0/react-redux.mjs"
    }
];

const messager = {
    container: document.getElementById("messages"),
    append() {
        const msgStr = Array.from(arguments).map(msg => JSON.stringify(msg)).join("\t");
        const el = document.createElement("div");
        el.innerHTML = `<div>${msgStr}</div>`;
        this.container.appendChild(el);
    },
    clear() {
        this.container.innerHTML = "";
    }
}

// status:   
// 100 cached
// 0 未缓存
// 1 排队中
// 2 下载中
// 3 下载完毕
// 4 下载失败

const statusMap = {
    100: "已缓存",
    0: "未缓存",
    1: "排队中",
    2: "下载中",
    3: "下载完毕",
    4: "下载失败"
}


function getStatusHtml(r) {

    if (r.status == 2) {
        return `<img src="./images/loading.gif" class='img-loading'></img>`
    }

    return statusMap[r.status] || ''
}


function renderTable(resources) {
    const htmlStr = resources.map(r => `
        <tr>
            <td>${r.key}</td>
            <td>${r.ver || ''}</td>
            <td>${Array.isArray(r.pre) ? r.pre.join(",") : ""}</td>
            <td>${r.url}</td>
            <td>${r.cached ? "yes" : "no"}</td>
            <td>${getStatusHtml(r)}</td>
            <td>${r.message || ''}</td>
        </tr>
        `).join("");
    tbody.innerHTML = htmlStr;
}

function addEvent(selector, name, fn, options = false) {
    const el = document.querySelector(selector);
    if (!el) {
        return;
    }
    el.addEventListener(name, fn, options);
}

function listenConsole() {

    ["log", "info", "warn", "error"].forEach(m => {
        const originM = console[m];

        console[m] = function () {
            messager.append.apply(messager, arguments);
            originM.apply(this, arguments)
        }
    })
}

listenConsole();

let startTime;


; (async function init() {

    const loader = new ResourceLoader(resourcesInfo, idb);

    s_total.innerHTML = resourcesInfo.length;

    const cachedDatas = await loader.getCacheInfos();

    const eInfos = resourcesInfo.map(r => {
        const cached = !!cachedDatas[r.key]
        return ({
            ...r,
            cached,
            status: cached ? 100 : 0,
            message: ''
        })
    })

    renderTable(eInfos);

    function updateInfo(info) {
        const item = eInfos.find(it => it.key == info.key);
        if (!item) return;
        item.status = info.status;
        item.message = info.message;
        item.cached = info.cached;
        renderTable(eInfos);
    }



    loader.on("loading", (info) => {
        console.log("loading:", info);
        updateInfo({
            ...info,
            status: 2
        })
    });

    loader.on("loaded", (info) => {
        console.log("loaded:", info);
        updateInfo({
            ...info,
            status: 3,
            cached: true
        })
    });


    loader.on("progress", (progress, info) => {
        console.log("progress:", progress, info);
        s_success.innerHTML = progress.loaded;
    });


    loader.on("completed", (datas) => {
        console.log("completed event:", datas);
        cost = Date.now() - startTime;
        console.log("total time:", cost)

        s_cost.innerHTML = `${cost} ms`
    });

    loader.on("all-loaded", (datas) => {
        console.log("loaded event:", datas);
        console.log("total time:", Date.now() - startTime)
    });

    loader.on("error", (error, info) => {
        console.log("error event:", error.message, info);
        updateInfo({
            ...info,
            status: 4,
            message: error && error.message || ''
        });
    });

    addEvent("#btn-load", "click", () => {
        messager.clear();
        startTime = Date.now();
        loader.reset();
        loader.startLoad();
    });


    addEvent("#btn-clear", "click", () => {
        window.idb.clear();
        location.reload();
    });


})()




