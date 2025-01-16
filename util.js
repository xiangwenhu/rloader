function fetchResource(url){
    return fetch(url, {
         method: "get",
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

function compareVersion(v1 = "", v2 = "") {
    if(v1 == v2){
        return 0;
    }
    const version1 = v1.split('.')
    const version2 = v2.split('.')
    const len = Math.max(version1.length, version2.length);

    while (version1.length < len) {
      version1.push('0')
    }
    while (version2.length < len) {
      version2.push('0')
    }
    for (let i = 0; i < len; i++) {
      const num1 = parseInt(version1[i]) || 0;
      const num2 = parseInt(version2[i]) || 0;
      if (num1 > num2) {
        return 1
      } else if (num1 < num2) {
        return -1
      }
    }
    return 0
}

const noop = ()=>{};


function getUrlWithVersion(resource){
    if(typeof resource.ver !== 'string'){
        return resource.url
    }
    return `${resource.url}?ver=${resource.ver}`
}