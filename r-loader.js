function fetchResource(url){
    return fetch(url, {
         method:"get",
         responseType: 'blob'
     }).then(res=>{
         if(res.status >= 400){
             throw new Error(res.status + "," + res.statusText);
         }
         return res;
     }).then(res=> res.blob());
 }  

 function copyObject(obj){
    return  JSON.parse(JSON.stringify(obj));
 }

function generateBlobUrl(blob){
   return URL.createObjectURL(blob); 
}

function validateKey(resources){
    let failed = false;
    // 空key检查
    const emptyKeys = resources.filter(r=> r.key == undefined || r.key == "");
    if(emptyKeys.length > 0){
        failed = true;
        console.error("ResourceLoader validateKey: 资源都必须有key");
        return failed;
    }
    // 资源重复检查
    const results = Object.create(null);
    resources.forEach(r=>{
        (results[r.key] = results[r.key]  || []).push(r);
    });   

    Object.keys(results).forEach(k=>{
        if(results[k].length > 1){
            console.error("key " +  k + " 重复了," + results[k].map(r=>r.url).join(","));
            failed = true;
        }
    });    
    return failed;
}

 // status: undefined loading loaded error
class ResourceLoader {
    constructor(resourcesInfo, storage = idb){
        this._originResourcesInfo = resourcesInfo;
        this._storage = storage;
           
        this._events = {
            loaded: [],
            progress: [],
            error: []
        };
    }

    reset(){
        const resourcesInfo = this._originResourcesInfo;
        this.resourcesInfo = resourcesInfo.map(r=> copyObject(r));
        this.resourcesInfoObj = resourcesInfo.reduce((obj, cur)=>{
            obj[cur.key] = cur;
            return obj;
        },{});
        // 已缓存， 缓存不等已加载，只有调用URL.createObjectURL之后，才会变为loaded
        this._cached = Object.create(null);
        this._loaded = Object.create(null); 
    }

    getCachedResources(keys){    
        const {resourcesInfo} = this;
        const cached = {} ;
        return this._storage.getMany(keys).then(results=>{  
            results.forEach((value, index)=>{
                if(value !==  undefined){
                    cached[resourcesInfo[index].key] = value;
                }
            });
            return cached;
        })
    }

    isCompleted(){
        return this.resourcesInfo.every(r=> r.status === "loaded" || r.status === "error");
    }

    isCached(key){
        return this._cached[key] != undefined;
    }

    onResourceLoaded = (info, data, isCached) => {
        console.log(`${info.key} is loaded`);
        const rInfo = this.resourcesInfo.find(r=> r.key === info.key);
        rInfo.status = "loaded";        

        this._loaded[rInfo.key] = {
            key: rInfo.key,
            url: generateBlobUrl(data)
        };

        this.emit("progress", this.getProgress(), rInfo);
        if(!isCached){
            rInfo.data = data;
            this._storage.set(info.key, rInfo);
        }
        this.nextLoad();
    }

    nextLoad(){
        if(!this.isCompleted()){
            return this.fetchResources()
        }
        this.emit("loaded", this._loaded);
    }

    getProgress(){
        const total = this.resourcesInfo.length;
        const loaded = Object.keys(this._loaded).length;
        return  {
            total,
            loaded,
            percent: total === 0 ? 0 :  + ((loaded/total) * 100).toFixed(2)
        }
    }

    get(key){
        return this._loaded[key]  || this.resourcesInfoObj[key];
    }

    emit(type, ...args){
        const events = this._events[type];
        if(!Array.isArray(events) || events.length  === 0){
            return;
        }
        events.forEach(event=> event.apply(null, args));
    }

    on(type, fn){
        const events = this._events[type];
        if(!Array.isArray(events)){
            return;
        }
        events.push(fn)
    }

    off(type, fn){
        const events = this._events[type];
        if(!Array.isArray(events)){
            return;
        }
        const index = events.find(f=> f === fn);
        if(index < -1){
            return;
        }
        events.splice(index, 1);
    }

    fetchResource(rInfo){
        return fetchResource(rInfo.url)
        .then(blob=> this.onResourceLoaded(rInfo, blob))
        .catch(error =>this.onResourceLoadError(error, rInfo));
    }

    onResourceLoadError(err, info){
        const rInfo = this.resourcesInfo.find(r=> r.key === info.key);
        rInfo.status = "error";        
        this.emit("error", err, info);    
        this.nextLoad();  
    }

    isPreLoaded(pre){
        const preArray = Array.isArray(pre) ? pre : [pre]
        return preArray.every(p=> this._loaded[p] !== undefined);
    }

    findCanLoadResource(){
        const info = this.resourcesInfo.find(r=> r.status == undefined && ( r.pre == undefined || this.isPreLoaded(r.pre)));
        return info;
    }

    fetchResources(){
        let info = this.findCanLoadResource();
        while(info){           
            if(this.isCached(info.key)){
                console.log(`${info.key} is cached, load from db, pre`, info.pre);

                const data = this._cached[info.key].data;
                this.onResourceLoaded(info, data, true);
                info = this.findCanLoadResource();
                continue;
            }
            console.log(`${info.key} is not cached, load from network ${info.url}, pre`, info.pre);
            info.status = "loading";
            this.fetchResource(info);
            info = this.findCanLoadResource();
        }
    }

    async prepare(){
        console.time("prepare");;
        const keys = this.resourcesInfo.map(r=>r.key);
        this._cached = await this.getCachedResources(keys);
        console.timeEnd("prepare");;
    }

    async startLoad(){
        const failed = validateKey(this.resourcesInfo);
        if(failed){
            return;
        }
        if(this.isCompleted()){
            this.emit("loaded", this._cached);
        }
        await this.prepare();
        this.fetchResources();
    }
}



