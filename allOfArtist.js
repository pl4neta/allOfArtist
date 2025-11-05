//@ts-check

// NAME: All Of Artist
// AUTHOR: pl4neta
// DESCRIPTION: Create a playlist with all songs of an artist

/// <reference path="../../spicetify-cli/globals.d.ts" />
(async function allOfArtist(){

  if (!(Spicetify.CosmosAsync && Spicetify.LocalStorage)){
    setTimeout(allOfArtist, 300);
    return;
  }

  const { CosmosAsync, URI } = Spicetify;


  function getConfig(){
    try {
      const parsed = JSON.parse(Spicetify.LocalStorage.get("allOfArtist:settings"));
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
      throw "";
    } catch {
      Spicetify.LocalStorage.set("allOfArtist:settings", JSON.stringify(defaultConfig));
      return defaultConfig;
    }
  }
  function saveConfig(){
    Spicetify.LocalStorage.set("allOfArtist:settings", JSON.stringify(CONFIG));
  }
  function resetConfig(){
    Spicetify.LocalStorage.set("allOfArtist:settings", JSON.stringify(defaultConfig));
  }

  const defaultConfig = { addFeatures: true, addCompilations: true, trackPriority: "trackCount", removeDupes: true, removeDupesConfirm: false, sortOrder: "oldest", inAppNotification: "subtle" };
  const CONFIG = getConfig();

  function styleSettings() {
    const style = document.createElement("style");
    style.innerHTML = `
    .setting-row::after {
      content: "";
      display: table;
      clear: both;
    }
    .setting-row {
      display: flex;
      padding: 10px 0;
      align-items: center;
      justify-content: space-between;
    }
    .setting-row .col.description {
      float: left;
      padding-right: 15px;
      width: 100%;
    }
    .setting-row .col.action {
      float: right;
      text-align: right;
    }
    button.switch {
      align-items: center;
      border: 0px;
      border-radius: 50%;
      background-color: rgba(var(--spice-rgb-shadow), .7);
      color: var(--spice-text);
      cursor: pointer;
      display: flex;
      margin-inline-start: 12px;
      padding: 8px;
    }
    button.switch.disabled,
    button.switch[disabled] {
      color: rgba(var(--spice-rgb-text), .3);
    }
        select {
    color: var(--spice-text);
    background: rgba(var(--spice-rgb-shadow), 0.7);
    border: 0;
    height: 32px;
    }
    `;
    content.appendChild(style);
  }


  function header(title) {
    const container = document.createElement("h2");
    container.innerText = title;
    return container;
  }

  function checkButton(name, desc, attributes) {
    const val = CONFIG[name];
    const container = document.createElement("div");
    container.classList.add("setting-row");
    container.innerHTML = `
          <label class="col description">${desc}</label>
          <div class="col action">
                    <button class="switch" ${attributes}>
                  <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor">${Spicetify.SVGIcons.check}</svg>
              </button>
                </div>
            `;
    const button = container.querySelector("button.switch");
    button.classList.toggle("disabled", !val);
    button.onclick = () => {
      const state = button.classList.contains("disabled");
      button.classList.toggle("disabled");
      CONFIG[name] = state;
      saveConfig();
    };
    return container;
  }


  function dropDown(name, desc, options, attributes) {
    const val = CONFIG[name]
    const container = document.createElement("div");
    container.classList.add("setting-row");
    let optionsHTML = '';
    for (const [key, value] of Object.entries(options)) {
      optionsHTML += "<option value='"+key+"'>"+value+"</option>";
    }
    container.innerHTML = `
          <label class="col description">${desc}</label>
          <div class="col action">
                    <select ${attributes}>
                        ${optionsHTML}
              </select>
                </div>
            `;

    const select = container.querySelector("select");
    select.selectedIndex = val;
    select.onchange = (e) => {
      const keys = Object.keys(options)
      CONFIG[name] = keys[select.selectedIndex];
      saveConfig();
    };
    return container;
  }


  function settingsContent() {
    content.appendChild(header("Inclusion"));
    content.appendChild(checkButton("addFeatures", "Include Features", ""));
    content.appendChild(checkButton("addCompilations", "Include Compilations", ""));

    content.appendChild(header("Dupes"));
    content.appendChild(checkButton("removeDupes", "Automatically Remove Dupes", ""));
    content.appendChild(checkButton("removeDupesConfirm", "Confirm Choices (Coming Soon!)", "disabled"));
    content.appendChild(dropDown("trackPriority", "Track Priority (Experimental!)", {trackCount: "Album's Track Count", oldest: "Oldest Releases"/*, newest: "Newest Releases"*/}, ""));

    content.appendChild(header("Sorting"));
    content.appendChild(dropDown("sortOrder", "Sort Order (Coming Soon!)", {oldest: "Oldest to Newest", newest: "Newest to Oldest", type: "Albums -> EPs -> Singles"}, "disabled"));

    content.appendChild(header("Feedback"));
    content.appendChild(dropDown("inAppNotification", "Notification", {subtle: "Subtle", popup: "Popup"}, "")); 
  }

  const content = document.createElement("div");
  styleSettings();
  settingsContent();


  async function getArtist(uris){
    const uri = uris[0].split(':');
    const type = uri[1];
    const id = uri[2];
    var artistData = {};
    if(type == 'artist'){
      let artist = await CosmosAsync.get('https://api.spotify.com/v1/artists/'+id);
      artistData.id = artist.id;
      artistData.name = artist.name;
    }
    else{
      if(type == 'album'){
        let artist = await CosmosAsync.get('https://api.spotify.com/v1/albums/'+id);
        artistData.id = artist.artists[0].id;
        artistData.name = artist.artists[0].name;
      }
      else{
        if(type == 'track'){
          let artist = await CosmosAsync.get('https://api.spotify.com/v1/tracks/'+id);
          artistData.id = artist.artists[0].id;
          artistData.name = artist.artists[0].name;
        }
        else{
          artistData.id = artistData.name = 'ERROR';
        }
      }
    }
    return artistData;
  }

  function createAllOf(uris){
    makePlaylist_getTracks(uris);
  }

  async function makePlaylist_getTracks(uris){
    const artistData = await getArtist(uris);
    const user = await CosmosAsync.get('https://api.spotify.com/v1/me');
    if(artistData.id != 'ERROR'){
      var artistAlbumsRaw = await CosmosAsync.get('https://api.spotify.com/v1/artists/'+artistData.id+'/albums?include_groups=album,single,appears_on&limit=50&offset=0');
      const total = artistAlbumsRaw.total;
      var artistAlbums = [];
      while(artistAlbums.length <= total) {
        for(let i = 0; i < artistAlbumsRaw.items.length; i++){
          if(!(!CONFIG["addCompilations"] && artistAlbumsRaw.items[i].album_type == 'compilation')){
            let tempDate = artistAlbumsRaw.items[i].release_date.replace(/-/g, '');
            while(tempDate.length < 8){
              tempDate += '0';
            }
            artistAlbums.push([tempDate, artistAlbumsRaw.items[i].id, artistAlbumsRaw.items[i].album_type]);
          }
        }
        if(artistAlbumsRaw.next != null)
          artistAlbumsRaw = await CosmosAsync.get(artistAlbumsRaw.next);
        else
          break;
      }
      artistAlbums.sort();
      const newPlaylist = await CosmosAsync.post('https://api.spotify.com/v1/users/' + user.id + '/playlists', {
        name: 'All Of '+artistData.name,
        description: 'Creating All Of '+artistData.name+'...',
        public: false,
        collaborative: false
      });
      await addFromAlbums(newPlaylist.id,artistData,artistAlbums, user);
      if (CONFIG["inAppNotification"] == "subtle") {
        Spicetify.showNotification('All Of '+artistData.name+' created.');
      }
      else if (CONFIG["inAppNotification"] == "popup") { 
        Spicetify.PopupModal.display({
          title: "All Of Artist",
          content: "All Of " +artistData.name+ " created.",
        });
      }
      await CosmosAsync.put('https://api.spotify.com/v1/playlists/' + newPlaylist.id, {
        description: 'Playlist with all '+artistData.name+' songs, generated by pl4neta\'s extenstion allOfArtist'
      });
    }
    else{
      Spicetify.showNotification('ERROR creating All Of '+artistData.name, true);
    }
  }

  async function getIndexFrom2dArray(array,key){
    for(let i = 0; i < array.length; i++){
      if(array[i].isrc == key)
        return i;
    }
    return false;
  }

  async function addTracks(playlistId, playlists, artistData, user){
    for(let i = 0; i < playlists[0].length; i++){
      await CosmosAsync.post('https://api.spotify.com/v1/playlists/'+playlistId+'/tracks', {
        uris: playlists[0][i]
      });
    }
    if (playlists.length > 1) {
      CosmosAsync.put('https://api.spotify.com/v1/playlists/' + playlistId, {
          name: 'All Of '+artistData.name+' 1/'+playlists.length,
      });
      for (let i = 1; i < playlists.length; i++) {
        let new_playlist = await CosmosAsync.post('https://api.spotify.com/v1/users/' + user.id + '/playlists', {
          name: 'All Of '+artistData.name+' '+ (i+1) +'/'+ playlists.length,
          description: 'Playlist with all '+artistData.name+' songs, generated by pl4neta\'s extenstion allOfArtist',
          public: false,
          collaborative: false
        });
        for (let r = 0; r < playlists[i].length; r++) {
          await CosmosAsync.post('https://api.spotify.com/v1/playlists/'+new_playlist.id+'/tracks', {
            uris: playlists[i][r]
          });
        }
      }
    }
  }

  async function addFromAlbums(playlistId,artistData,array,user){
    var track_history = [];
    var tracksAdd = [];

    var albumTracksAdd = [];
    while (array.length > 0){
      let albums = await CosmosAsync.get('https://api.spotify.com/v1/albums?ids='+array.slice(0,20).map(inner => inner[1]).join(","));
      array.splice(0,20);
      for(const album of albums.albums) {
        let tracks = album.tracks;
        do {
          for(let i = 0; i < tracks.items.length; i++){
            const track = tracks.items[i]
            if (!CONFIG["addFeatures"] && track.artists[0].id != artistData.id) continue
            let track_artists = []
            for(let c = 0; c < track.artists.length; c++){
              track_artists.push(track.artists[c].id)
            }
            if (track_artists.includes(artistData.id)) {
              if(CONFIG["removeDupes"]){
                let track_data = await CosmosAsync.get('https://api.spotify.com/v1/tracks/'+track.id);
                let trackInfo = {"name": track_data.name, "uri": track_data.uri, "trackCount": tracks.total, "type": album.album_type, "index": tracksAdd.length+"_"+albumTracksAdd.length, "isrc": track_data.external_ids.isrc};
                let playlist_tracks_index = await getIndexFrom2dArray(track_history, track_data.external_ids.isrc);
                if (playlist_tracks_index){
                  if(CONFIG["trackPriority"] == "trackCount" && (album.album_type != "compilation" && (track_history[playlist_tracks_index].type == "compilation" || (track_history[playlist_tracks_index].type != "compilation" && tracks.total > track_history[playlist_tracks_index].trackCount)))){
                    let removeIndex = (track_history[playlist_tracks_index].index).split("_");
                    track_history.splice(playlist_tracks_index,1,{});
                    if (tracksAdd.length > removeIndex[0]) tracksAdd[removeIndex[0]].splice(removeIndex[1],1,"remove");
                    else albumTracksAdd.splice(removeIndex[1],1,"remove");
                    track_history.push(trackInfo);
                    albumTracksAdd.push(trackInfo.uri);
                  }
                }
                else {
                  track_history.push(trackInfo);
                  albumTracksAdd.push(trackInfo.uri);
                }
              }
              else {
                albumTracksAdd.push(track.uri);
              }
              if (albumTracksAdd.length == 100) {
                tracksAdd.push(albumTracksAdd);
                albumTracksAdd = [];
              }
            }
          }
          if (!tracks.next) break;
          tracks = await CosmosAsync.get(album.tracks.next);
        } while (true)
      };
    }
    if (albumTracksAdd.length > 0) tracksAdd.push(albumTracksAdd);
    for (let i = 0; i < tracksAdd.length; i++) {
      for (let r = tracksAdd[i].length; r > 0; r--) {
        if (tracksAdd[i][r] == "remove") tracksAdd[i].splice(r,1);
      }
    }
    let playlists = []
    while (tracksAdd.length > 0) {
      playlists.push(tracksAdd.slice(0, 100))
      tracksAdd.splice(0, 100)
    }
    await addTracks(playlistId, playlists, artistData, user)
  }

  async function shouldDisplayContextMenu(uris){
    if (uris.length > 1){
      return false;
    }
    const uri = uris[0];
    const uriObj = Spicetify.URI.fromString(uri);
    if (uriObj.type === Spicetify.URI.Type.TRACK || uriObj.type === Spicetify.URI.Type.ARTIST || uriObj.type === Spicetify.URI.Type.ALBUM){
      return true;
    }
    return false;
  }

  new Spicetify.Menu.Item(
    "All Of Artist",
    false,
    () => {
      Spicetify.PopupModal.display({
        title: "All Of Artist Settings",
        content,
        isLarge: true,
      });
    },
    'artist'
  ).register();

  const cntxMenu = new Spicetify.ContextMenu.Item(
    'Create All Of Artist',
    createAllOf,
    shouldDisplayContextMenu,
    'artist'
  );
  cntxMenu.register();
})();
