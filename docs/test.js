const resourcesInfo = [
    {
        key: "mqtt",
        url: "https://cdn.bootcdn.net/ajax/libs/mqtt/4.2.8/mqtt.js",
        ver: "4.2.8"
    },
    {
        pre: ["promise"],
        key: "axios",
        url: "https://cdn.bootcdn.net/ajax/libs/axios/0.21.1/axios.js",
        ver: "0.21.1"
    }
    , {
        key: "lottie",
        url: "https://cdn.bootcdn.net/ajax/libs/lottie-web/5.7.12/lottie.js"
    }, {
        key: "flv",
        url: "https://cdn.bootcdn.net/ajax/libs/flv.js/1.6.2/flv.min.js"
    },
    {
        key: "promise",
        url: "https://cdn.bootcdn.net/ajax/libs/es6-promise/4.2.8/es6-promise.auto.js"
    }, {
        key: "react-dom",
        url: "https://cdn.bootcdn.net/ajax/libs/react-dom/17.0.2/umd/react-dom.production.min.js"
    }, {
        pre: "react-dom",
        url: "https://cdn.bootcdn.net/ajax/libs/react-dom/17.0.2/umd/react-dom.production.min.js",
        key: "react"
    }, {
        key: "react-router",
        pre: ["react", "react-dom"],
        url: "https://cdn.bootcdn.net/ajax/libs/react-router/5.2.0/react-router.js"
    }, {
        key: "redux",
        pre: ["react", "react-dom"],
        url: "https://cdn.bootcdn.net/ajax/libs/redux/4.1.0/redux.min.js"
    }, {
        key: "react-redux",
        pre: ["react", "react-dom", "redux"],
        url: "https://cdn.bootcdn.net/ajax/libs/react-redux/7.2.4/react-redux.min.js"
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

function renderTable(resources) {
    const htmlStr = resources.map(r => `
        <tr>
            <td>${r.key}</td>
            <td>${r.ver || ''}</td>
            <td>${Array.isArray(r.pre) ? r.pre.join(",") : ""}</td>
            <td>${r.url}</td>
            <td>${r.cached ? "yes" : "no"}</td>
            <td>${statusMap[r.status] || ''}</td>
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



function getStausText() {

}


; (async function init() {

    const rl = new ResourceLoader(resourcesInfo, idb);

    const cachedDatas = await rl.getCacheInfos();

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
        renderTable(eInfos);
    }



    rl.on("loading", (info) => {
        console.log("loading:", info);
        updateInfo({
            ...info,
            status: 2
        })
    });

    rl.on("loaded", (progress, info) => {
        console.log("loaded:", progress, info);
        updateInfo({
            ...info,
            status: 3
        })
    });

    rl.on("completed", (datas) => {
        console.log("completed event:", datas);
        console.log("total time:", Date.now() - startTime)
    });

    rl.on("all-loaded", (datas) => {
        console.log("loaded event:", datas);
        console.log("total time:", Date.now() - startTime)
    });

    rl.on("error", (error, info) => {
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
        rl.reset();
        rl.startLoad();
    });


    addEvent("#btn-clear", "click", () => {
        window.idb.clear();
    });


})()




