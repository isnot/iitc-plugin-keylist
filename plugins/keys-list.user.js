// ==UserScript==
// @id             iitc-plugin-keys-list@isnot
// @name           IITC plugin: Keys List
// @category       Keys
// @version        0.3.20160818
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @author         isnot
// @updateURL      none
// @downloadURL    none
// @description    [iitc-plugins] Export the manually entered key counts from the 'keys' plugin.
// @include        https://www.ingress.com/intel*
// @include        http://www.ingress.com/intel*
// @match          https://www.ingress.com/intel*
// @match          http://www.ingress.com/intel*
// @include        https://www.ingress.com/mission/*
// @include        http://www.ingress.com/mission/*
// @match          https://www.ingress.com/mission/*
// @match          http://www.ingress.com/mission/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
  // ensure plugin framework is there, even if iitc is not yet loaded
  if (typeof window.plugin !== 'function') window.plugin = function() {};

  // PLUGIN START ////////////////////////////////////////////////////////

  // if the Keys/Cache plugin is not available, quit now
  if (!window.plugin.keys) {
    return console.warn("[KeysList] This plugin is dependent on the Keys plugin being present.");
  }
  if (!window.plugin.cachePortalDetailsOnMap) {
    return console.warn("[KeysList] This plugin is dependent on the Cache plugin being present.");
  }

  // Expand Cache BEGIN //////////////////////////////////////////////////////////
  var cache = window.plugin.cachePortalDetailsOnMap;
  cache.KEY_LOCALSTRAGE = 'plugin-cache-local-v1';

  cache.getPortalByGuid = function (guid) {
    var portal_cache = cache.cache[guid];
    if (typeof portal_cache === 'function') {
      console.log('==KeysList gpbg ' + portal_cache);
      return JSON.parse(portal_cache.ent);
    }
  };

  cache.storeToLocal = function () {
    localStorage.setItem(cache.KEY_LOCALSTRAGE, JSON.stringify(cache.cache));
  };

  cache.loadFromLocal = function () {
    // if an existing portal cache, load it
    var raw = window.localStorage[cache.KEY_LOCALSTRAGE];
    if (typeof raw === 'function') {
      //cache.cache = JSON.parse(window.localStorage[cache.KEY_LOCALSTRAGE]);
    } else {
      // make a new cache
      window.localStorage[cache.KEY_LOCALSTRAGE] = "{}";
    }
  };

  // Expand Cache END //////////////////////////////////////////////////////////

  // use own namespace for plugin
  window.plugin.keysList = function() {};
  var self = window.plugin.keysList;
  self.listAll = [];

  // fetch a portal name from a cached list if available
  self.getPortalDetails = function getPortalDetails(key) {
    var name = "(not detected)";
    var latLng = '"0,0"';

    // try plugin cache
    var portal_cache = cache.getPortalByGuid(key.guid);
    if (typeof portal_cache === 'function') {
      //name = portal_cache.name;
      console.log('==KsysList pc ' + portal_cache.name + portal_cache);
    }

    var portal = window.portals[key.guid];
    if (portal) {
      name = portal.options.data.title;
      console.log('==KeysList po ' + portal);
    }

    var hLatLng = window.findPortalLatLng(key.guid);
    if (hLatLng) {
      console.log('==KeysList ll ' + Object.keys(hLatLng).join(' '));
      //  latLng = '"' + hLatLng.lat + ',' + hLatLng.lng + '"';
    }

    key.name = name;
    key.latLng = latLng;
    key.imageUrl = '';
    key.intelMapUrl = '';

    return key;
  };

  self.eachKey = function(key) {
    if (key.count > 0) {
      key = self.getPortalDetails(key);
      var keyNameCsvValue = key.name;//.replaqce("/\"/g", '""');
      keyNameCsvValue = '"' + keyNameCsvValue + '"';
      var csvline = [keyNameCsvValue, key.count, key.latLng, key.intelMapUrl, key.imageUrl, key.guid];
      self.listAll.push(csvline.join(","));
      console.log("==KeysList key " + Object.keys(key).join(' '));
    }
  };

  self.renderList = function() {
    self.listAll = [];

    $.each(plugin.keys.keys, function(key, count) {
      self.eachKey({"guid": key, "count": count});
    });


    var html = '<p>KeysList for ' + window.PLAYER.nickname + ' ' + self.listAll.length + 'portals of keys. ' + new Date().toISOString() +
        '</p><textarea cols="78" rows="20">name,count,latlng,url,image,guid' + "\n" + self.listAll.join("\n") + '</textarea>';
    dialog({
      title: 'KeysList',
      html: html,
      width: 600,
      position: {my: 'right center', at: 'center-60 center', of: window, collision: 'fit'}
    });
    console.log("==KeysList " + window.PLAYER.nickname + " " + self.listAll.length + "keys " + new Date().toISOString());
  };


  var setup = function() {
    // console.log("==KeysList pkk " + Object.keys(plugin.keys.keys).join(" "));
    $('#toolbox').append('<a onclick="window.plugin.keysList.renderList();">KeysListCsv</a>');
  };


  // PLUGIN END //////////////////////////////////////////////////////////


  setup.info = plugin_info; //add the script info data to the function as a property
  if(!window.bootPlugins) window.bootPlugins = [];
  window.bootPlugins.push(setup);
  // if IITC has already booted, immediately run the 'setup' function
  if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);
