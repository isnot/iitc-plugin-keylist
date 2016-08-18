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

    // what is this?
    if (portal_cache && (portal_cache.length === 3)) {
      portal_cache.ent = delete portal_cache[2];
    }

    if (portal_cache && portal_cache.ent) {
      console.log('==KeysList gpbg ' + Object.keys(portal_cache).join(' '));
      return window.decodeArray.portalSummary(portal_cache.ent);
    }
  };

  cache.storeToLocal = function () {
    var lc = cache.cache;
    if (Object.keys(lc).length) {
      $.each(lc, function(guid, data) {
        if (data.ent) console.log(data.ent);
        // I dont know what I do...
        if ((typeof data.ent === 'object') && (data.ent.length === 3)) {
          data.ent = data.ent[2];
          data.loadtime = data.ent[1];
          delete data.ent[0];
          delete data.ent[1];
          delete data.ent[2];
        }
        lc[guid] = data;
      });
      localStorage.setItem(cache.KEY_LOCALSTRAGE, JSON.stringify(lc));
    }

    console.log('plugin-cache-local: storeToLocal ' + Object.keys(lc).length);
  };

  cache.loadFromLocal = function () {
    // if an existing portal cache, load it
    var raw = window.localStorage[cache.KEY_LOCALSTRAGE];
    if (raw) {
      cache.merge(JSON.parse(raw));
      console.log('plugin-cache-local: loadFromLocal ' + Object.keys(cache.cache).length);
    } else {
      // make a new cache
      window.localStorage[cache.KEY_LOCALSTRAGE] = "{}";
      console.log('plugin-cache-local: init');
    }
  };

  cache.merge = function (inbound) {
    //if (cache.cache.length < 1) {
    //  cache.cache = inbound;
    //  return inbound.length;
    //}

    $.each(inbound, function (guid, data) {
      console.log('==KeysList merge ' + Object.keys(data.ent).join(' '));
      if (data.ent && !cache.cache.hasOwnProperty(guid)) {
        cache.cache[guid] = data;
        console.log(data);
      }
    });
    return Object.keys(cache.cache).length;
  };

  // Expand Cache END //////////////////////////////////////////////////////////

  // use own namespace for plugin
  window.plugin.keysList = function() {};
  var self = window.plugin.keysList;
  self.INTEL_URL = 'https://www.ingress.com/intel';
  self.DEFAULT_ZOOM_LEVEL = '17';
  self.listAll = [];

  // fetch a portal info from a cached list if available
  self.getPortalDetails = function getPortalDetails(key) {
    var title = "(not detected)";
    var latLng = '0,0';
    var imageUrl = '';

    // try plugin cache
    var portal_cache = cache.getPortalByGuid(key.guid);
    if (portal_cache) {
      title = portal_cache.title;
      imageUrl = window.fixPortalImageUrl(portal_cache.image);
      console.log('==KsysList pc ' + portal_cache + Object.keys(portal_cache).join(' '));
    }

    var data = (window.portals[key.guid] && window.portals[key.guid].options.data) || window.portalDetail.get(key.guid) || null;
    if (data) {
      console.log('==KsysList pd ' + data.title);
      if (data.title) title = data.title;
      imageUrl = window.fixPortalImageUrl(data.image);
    }

    if (imageUrl.indexOf('//') === 0) {
      imageUrl = 'http:' + imageUrl;
    }
    if (imageUrl.indexOf(DEFAULT_PORTAL_IMG) !== -1) {
      imageUrl = '';
    }

    var hLatLng = window.findPortalLatLng(key.guid);
    if (hLatLng) {
      latLng = hLatLng.lat + ',' + hLatLng.lng;
    }

    key.title = title;
    key.latLng = latLng;
    key.imageUrl = imageUrl;
    if (latLng === '0,0') {
      key.intelMapUrl = '';
    } else {
      key.intelMapUrl = self.INTEL_URL + '?ll=' + latLng + '&z=' + self.DEFAULT_ZOOM_LEVEL + '&pll=' + latLng;
    }

    return key;
  };

  self.csvValue = function(str) {
    if (str) {
      return '"' + str.replace("/\"/g", '""') + '"';
    } else {
      return '';
    }
  };

  self.eachKey = function(key) {
    if (key.count > 0) {
      key = self.getPortalDetails(key);
      var csvline = [
        self.csvValue(key.title),
        parseInt(key.count, 10),
        self.csvValue(key.latLng),
        self.csvValue(key.intelMapUrl),
        self.csvValue(key.imageUrl),
        key.guid
      ];
      self.listAll.push(csvline.join(","));
    }
  };

  self.renderList = function() {
    self.listAll = [];

    $.each(plugin.keys.keys, function(key, count) {
      self.eachKey({"guid": key, "count": count});
    });

    var html = '<p>KeysList for ' + window.PLAYER.nickname + ' ' + self.listAll.length + 'portals of keys. ' + new Date().toISOString() +
        '</p><textarea cols="78" rows="20">name,count,latlng,intelmap,image,guid' + "\n" + self.listAll.join("\n") + '</textarea>';
    dialog({
      title: 'KeysList',
      html: html,
      width: 600,
      position: {my: 'right center', at: 'center-60 center', of: window, collision: 'fit'}
    });
    // console.log("==KeysList " + window.PLAYER.nickname + " " + self.listAll.length + " " + new Date().toISOString());

    cache.storeToLocal();// for debug
  };


  var setup = function() {
    // console.log("==KeysList setup ");
    $('#toolbox').append('<a onclick="window.plugin.keysList.renderList();">KeysListCsv</a>');
    addHook('iitcLoaded',        window.plugin.cachePortalDetailsOnMap.loadFromLocal);
    addHook('mapDataRefreshEnd', window.plugin.cachePortalDetailsOnMap.storeToLocal);
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
