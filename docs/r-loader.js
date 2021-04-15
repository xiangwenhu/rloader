 class Emitter{
    constructor(){              
        this._events = Object.create(null);
    }

    emit(type, ...args){
        const events = this._events[type];
        if(!Array.isArray(events) || events.length  === 0){
            return;
        }
        events.forEach(event=> event.apply(null, args));
    }

    on(type, fn){
        const events = this._events[type] || (this._events[type] = []);       
        events.push(fn)
    }

    off(type, fn){
        const events = this._events[type] || (this._events[type] = []);   
        const index = events.find(f=> f === fn);
        if(index < -1){
            return;
        }
        events.splice(index, 1);
    }
 }
 
 // status: undefined loading loaded error
class ResourceLoader extends Emitter {
    constructor(resourcesInfo, storage = defaultStorage){
        super();
        this._originResourcesInfo = resourcesInfo;
        this._storage = storage;     
        this.reset();
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
            const info = {
                data,
                key: rInfo.key,
                url: rInfo.url,
                ver: rInfo.ver || ""
            };
            this._storage.set(info.key, info);
        }
        this.nextLoad();
    }

    nextLoad(){
        if(!this.isCompleted()){
            return this.fetchResources()
        }
        this.emit("completed", this._loaded);
        // 全部正常加载，才触发loaded事件
        if(this.resourcesInfo.every(r=> r.status === "loaded")){
            this.emit("loaded", this._loaded);
        }
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
        return (this._loaded[key]  || this.resourcesInfoObj[key]).url;
    }


    fetchResource(rInfo){
        return fetchResource(`${rInfo.url}?ver=${rInfo.ver}`)
        .then(blob=> this.onResourceLoaded(rInfo, blob))
        .catch(error =>this.onResourceLoadError(error, rInfo));
    }

    onResourceLoadError(err, info){
        const rInfo = this.resourcesInfo.find(r=> r.key === info.key);
        rInfo.status = "error";  
        
        console.error(`${info.key}(${info.url}) load error: ${err.message}`);
        this.emit("error", err, info);    

        this.setFactorErrors(info);
        this.nextLoad();  
    }

    setFactorErrors(info){
        // 未开始，pre包含info.key
        const rs = this.resourcesInfo.filter(r=> !r.status && r.pre && r.pre.indexOf(info.key) >= 0);
        if(rs.length < 0){
            return;
        }
        rs.forEach(r=> {
            console.warn(`mark ${r.key}(${r.url}) as error because it's pre failed to load`);
            r.status = "error"
        });
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
            const cache = this._cached[info.key];

            // 有缓存
            if(cache){
                const cache = this._cached[info.key];
                const isOlder = compareVersion(cache.ver, info.ver || "") < 0;

                // 缓存过期
                if(isOlder){
                    console.warn(`${info.key} is cached, but is older version, cache:${cache.ver} request: ${info.ver}`);
                }else {
                    console.log(`${info.key} is cached, load from db, pre`, info.pre);
                    this.onResourceLoaded(info, cache.data, true);
                    info = this.findCanLoadResource();
                    continue;
                }
            }
            console.log(`${info.key} load from network ${info.url}, pre`, info.pre);
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
            this.emit("completed", this._cached);
        }
        await this.prepare();
        this.fetchResources();
    }
}



