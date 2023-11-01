// Detect if Vimeo player is present
function vimeoPlayerPresent() {
    for (var e = document.getElementsByTagName("iframe"), x=0; x < e.length; x++) {
        if (/^https?:\/\/player.vimeo.com/.test(e[x].src)) {
            return true;
        }
    }
    return false;
}

let dataLayer = (typeof(dataLayer) !== "undefined" && dataLayer instanceof Array) ? dataLayer : [];
let videoLabels=[];
let lastP=[];

//we declare letiables that will hold information about the video being played
let _playerTitle = {} 
let _playerAuthor = {} 
let _playerAuthorURL = {}
let _playerUploadDate = {}; 

// Launch Vimeo Video Listener
try{
    init();
}catch(err){
    dataLayer.push({
        'event': 'gtm.error',
        'errorMessage': err.message,
        'tag': 'Vimeo Video Listener'
    })
}


// Initialize the Vimeo player
function init(){
    try{
        let player=document.getElementsByTagName("iframe");
        for (let i = 0; i < player.length; ++i) {
            let url=player[i].getAttribute("src");
            if(/player\.vimeo\.com\/video/.test(url)){ // vimeo iframe found
                
                if(!player[i].hasAttribute("id")){// id attribute missing
                    player[i].setAttribute("id","vimeo_id_"+i); // add id attribute
                } 
                let urlUpdated=false;
                if(!/api=/.test(url)){ // check to see if api parameter is in src attribute
                    url=updateUrl(url,"api",1);
                    urlUpdated=true;
                }
                if(!/player_id=/.test(url)){ // check if player_id is in src attribute
                    url=updateUrl(url,"player_id",player[i].getAttribute("id"));
                    urlUpdated=true;
                }
                if(urlUpdated){ // repopulate src attribute with added parameters
                    player[i].setAttribute("src",url)
                }
                videoLabels[player[i].getAttribute("id")]=player[i].getAttribute("src"); // id to label dictionary
            }
        }
        // Listen for messages from the player
        if (window.addEventListener){
            window.addEventListener('message', onMessageReceived, false);
        }else {
            window.attachEvent('onmessage', onMessageReceived, false);
        }
    }catch(err){
        console.log(err);
    }
}

function updateUrl(url,param,value){
    try{
        return url+((/\?/.test(url)) ? "&" : "?")+param+"="+value; 
    }catch(err){
        console.log(err);
    }
}

// Handle messages received from the player
function onMessageReceived(e) {
    try{
        let data = e.data;
        if(typeof data === "string"){
            data = JSON.parse(data);
        }
        switch (data.event){
            case 'ready':
                onReady(data);
                break;
            case 'play':
                onPlay(data);
                break;
            case 'pause':
                onPause(data);
                break;
            case 'timeupdate':
                onPlayProgress(data);
                break;
        }
    }catch(err){
        console.log(err);
    }
}

// Helper function for sending a message to the player
function post(action, value) {
    try{
        let data = {
            method: action
        }

        if (value) {
            data.value = value;
        }

        let message = JSON.stringify(data);
        console.log(message);

        let player = document.getElementsByTagName("iframe");
        let url = "";
        let prot = "";

        for (let i = 0; i < player.length; ++i) {
            url=player[i].getAttribute("src");
            if(/player\.vimeo\.com\/video/.test(url)){
                // Check if protocol exists
                prot = player[i].getAttribute('src').split('?')[0].split('//')[0];
                // If protocol doesn't exist, then need to append to "url"
                if (!prot){
                    url="https:" + player[i].getAttribute("src").split('?')[0];
                }                
                player[i].contentWindow.postMessage(data, url);
            }
        }
    }catch(err){
        console.log(err);
    }
}

function getLabel(id){
    try{
        return videoLabels[id].split('?')[0].split('/').pop();
    }catch(err){
        console.log(err);
    }
}

//our function that will use the Vimeo oEmbed API to retrieve additional information about the video
function getVimeoInfo(url, callback) {
    let script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    document.getElementsByTagName('body')[0].appendChild(script);
}

//the callback function which takes the data received from the Vimeo oEmbed API and places it into the corresponding objectes
function vimeoCallback(e){
    console.log(e);
    _playerTitle[e['video_id']] = e['title'];
    _playerAuthor[e['video_id']] = e['author_name']
    _playerAuthorURL[e['video_id']] = e['author_url']
    _playerUploadDate[e['video_id']] = e['upload_date']
}

function onReady(data) {
    try{
        //execute our function which queries the Vimeo oEmbed API once the embedded videos are "ready"
        getVimeoInfo("https://www.vimeo.com/api/oembed.json?url=https://vimeo.com/"+getLabel(data.player_id)+"&callback=vimeoCallback", vimeoCallback);
        post('addEventListener', 'play');
        post('addEventListener', 'pause');
        post('addEventListener', 'finish');
        post('addEventListener', 'playProgress');
    }catch(err){
        console.log(err);
    }
}

function onPlay(data){
    try{
        let t = data.data.duration - data.data.seconds <= 1.5 ? 1 : (Math.floor(data.data.seconds / data.data.duration * 4) / 4).toFixed(2); 
        dataLayer.push({
            event: "video",
            video_action: "play",
            video_url: 'https://vimeo.com/' + getLabel(data.player_id),
            video_percent: data.data.percent.toFixed(2) * 100,
            video_title: _playerTitle[getLabel(data.player_id)].toLowerCase()
        });
    }catch(err){
        console.log(err);
    }
}

function onPause(data){
    try{
        let t = data.data.duration - data.data.seconds <= 1.5 ? 1 : (Math.floor(data.data.seconds / data.data.duration * 4) / 4).toFixed(2); 
        dataLayer.push({
            event: "video",
            video_action: "pause",
            video_url: 'https://vimeo.com/' + getLabel(data.player_id),
            video_percent: data.data.percent.toFixed(2) * 100,
            video_title: _playerTitle[getLabel(data.player_id)].toLowerCase()
        });
    }catch(err){
        console.log(err);
    }
}

// Track progress: 25%, 50%, 75%, 100%
function onPlayProgress(data) {
    try{
        let t = data.data.duration - data.data.seconds <= 1.5 ? 1 : (Math.floor(data.data.seconds / data.data.duration * 4) / 4).toFixed(2); 
        if (!lastP[data.player_id] || t > lastP[data.player_id]) {
            lastP[data.player_id]=t;
            if (parseFloat(t) != 0){
                dataLayer.push({
                    event: "video",
                    video_action: "progress",
                    video_url: 'https://vimeo.com/' + getLabel(data.player_id),
                    video_percent: t * 100,
                    video_title: _playerTitle[getLabel(data.player_id)].toLowerCase()
                })
            }
        }
    }catch(err){
        console.log(err);
    }
}