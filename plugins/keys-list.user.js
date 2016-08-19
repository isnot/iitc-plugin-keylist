// ==UserScript==
// @id             iitc-plugin-keys-list@isnot
// @name           IITC plugin: Keys List
// @category       Keys
// @version        0.4.20160819
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
    if (!portal_cache || !typeof portal_cache.ent) return;

    var ent = portal_cache.ent;
    // what is this?
    if (Array.isArray(ent) && (ent.length === 3)) {
      ent = ent[2];
    }

    // ent should be Array and have 18 elements.
    if (Array.isArray(ent) {
      return window.decodeArray.portalSummary(ent);
    }
  };

  cache.storeToLocal = function () {
    var lc = cache.cache;
    if (Object.keys(lc).length) {
      $.each(lc, function(guid, data) {
        // if (data.ent) console.log(data.ent); for DEBUG
        var d = {};
        // I dont know what I do...
        if (data.ent && Array.isArray(data.ent) && (data.ent.length === 3)) {
          d.loadtime = data.ent[1];
          d.ent = data.ent[2];
        } else {
          d.loadtime = data.loadtime;
          d.ent = data.ent;
        }
        lc[guid] = d;
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
    $.each(inbound, function (guid, data) {
      console.log('plugin-cache-loacl: merge ' + data.ent.toString);// for DEBUG
      if (data.ent && !cache.cache[guid]) {
        cache.cache[guid] = data;
      }
    });
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
      if (portal_cache.title) title = portal_cache.title;
      imageUrl = window.fixPortalImageUrl(portal_cache.image);
      latLng = portal_cache.latE6/1E6 + ',' + portal_cache.lngE6/1E6;
      console.log('==KsysList from cache ' + portal_cache.title);
    }

    var data = (window.portals[key.guid] && window.portals[key.guid].options.data) || window.portalDetail.get(key.guid) || null;
    if (data) {
      console.log('==KsysList from view ' + data.title);
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
    if (hLatLng && (latLng === '0,0')) {
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
    // cache.loadFromLocal();// for DEBUG

    $.each(plugin.keys.keys, function(key, count) {
      self.eachKey({"guid": key, "count": count});
    });

    var html = '<p>KeysList for ' + window.PLAYER.nickname + ' ' + self.listAll.length + ' portals in keys. ' + new Date().toISOString() +
        ' <button type="button" class="selectCSV" onclick="window.plugin.keysList.selectCSV();">SelectAll</button></p>' +
        '<pre class="keysListCSV">name,count,latlng,intelmap,image,guid' + "\n" + self.listAll.join("\n") + '</pre>';
    dialog({
      title: 'KeysList',
      html: html,
      width: 600,
      position: {my: 'right center', at: 'center-60 center', of: window, collision: 'fit'}
    });
    // console.log("==KeysList " + self.listAll.length);// for DEBUG
    // cache.storeToLocal();// for DEBUG
  };

  self.setupCSS = function() {
    $("<style>")
      .prop("type", "text/css")
      .html(".keysListCSV {width: 580px; height: 380px; overflow-y: scroll; overflow-x: hidden; background: white;}")
      .appendTo("head");
  };

  self.selectCSV = function() {
    $(".keysListCSV:first").css('color','red');
    //$(".keysListCSV:first").focus(function(){$(this).select();});
  };

  var setup = function() {
    self.setupCSS();
    $('#toolbox').append('<a onclick="window.plugin.keysList.renderList();">KeysListCSV</a>');
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
