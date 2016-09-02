// ==UserScript==
// @id             iitc-plugin-keys-list@isnot
// @name           IITC plugin: Keys List
// @category       Keys
// @version        0.6.20160903
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @author         isnot
// @updateURL      https://github.com/isnot/iitc-plugin-keys-list/raw/master/plugins/keys-list.user.js
// @downloadURL    https://github.com/isnot/iitc-plugin-keys-list/raw/master/plugins/keys-list.user.js
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

  // Expand Cache BEGIN //////////////////////////////////////////////////////////

  var iitcVersionNumber = Number(window.iitcBuildDate.replace(/\D/g, ''));
  if (iitcVersionNumber => '20151111074206') {
    // if the Cache plugin is not available, quit now
    if (!window.plugin.cachePortalDetailsOnMap) {
      return console.warn('[KeysList] This plugin is dependent on the Cache plugin being present.');
    }

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
      if (Array.isArray(ent)) {
        return window.decodeArray.portalSummary(ent);
      }
    };

    cache.storeToLocal = function () {
      var lc = cache.cache;
      if (Object.keys(lc).length) {
        $.each(lc, function(guid, data) {
          // if (data.ent) console.log(data.ent);// for DEBUG
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
        window.localStorage[cache.KEY_LOCALSTRAGE] = '{}';
        console.log('plugin-cache-local: init');
      }
    };

    cache.merge = function (inbound) {
      $.each(inbound, function (guid, data) {
        console.log('plugin-cache-loacl: merge ' + data.ent.toString());// for DEBUG
        if (data.ent && !cache.cache[guid]) {
          cache.cache[guid] = data;
        }
      });
    };

  } // if window.iitcBuildDate

  // Expand Cache END //////////////////////////////////////////////////////////

  // use own namespace for plugin
  window.plugin.keysList = function() {};
  var self = window.plugin.keysList;
  self.INTEL_URL = 'https://www.ingress.com/intel';
  self.DEFAULT_ZOOM_LEVEL = '17';
  self.CSV_HEADER = 'name,count,latlng,intelmap,image,memo,guid';
  self.listAll = [];

  // fetch a portal info from Bookmarks if available
  self.getPortalInfoFromBookmarks = function getPortalInfoFromBookmarks(guid) {
    if (!window.plugin.bookmarks || !guid) return;
    var bkmrkinfo = window.plugin.bookmarks.findByGuid(guid);
    if (!bkmrkinfo) return;

    var folders = window.plugin.bookmarks.bkmrksObj.portals;
    if (folders.hasOwnProperty(bkmrkinfo.id_folder)) {
      var folder = folders[bkmrkinfo.id_folder];
      if (folder.bkmrk.hasOwnProperty(bkmrkinfo.id_bookmark)) {
        return $.extend(folder.bkmrk[bkmrkinfo.id_bookmark], {bkmrkfolder: folder.label});
      }
    }

    var others = window.plugin.bookmarks.bkmrksObj.portals.idOthers.bkmrk;
    if (others.hasOwnProperty(bkmrkinfo.id_bookmark)) {
      return $.extend(others[bkmrkinfo.id_bookmark], {bkmrkfolder: 'other'});
    }
  };

  // fetch a portal info from a cached list if available
  self.getPortalDetails = function getPortalDetails(key) {
    var title = '';
    var latLng = '';
    var imageUrl = '';
    var annotation = '';

    // try plugin bookmark
    var portal_bkmrk = self.getPortalInfoFromBookmarks(key.guid);
    if (portal_bkmrk) {
      if (portal_bkmrk.label !== 'undefined') title = portal_bkmrk.label;
      latLng = portal_bkmrk.latlng;
      annotation = portal_bkmrk.bkmrkfolder;
      // console.log('==KsysList from bookmark ' + portal_bkmrk.label);// for DEBUG
    }

    // try plugin cache if available
    if (window.plugin.cachePortalDetailsOnMap && window.plugin.cachePortalDetailsOnMap.hasOwnProperty('getPortalByGuid')) {
      var portal_cache = window.plugin.cachePortalDetailsOnMap.getPortalByGuid(key.guid);
      if (portal_cache) {
        if (portal_cache.title && !title) title = portal_cache.title;
        imageUrl = window.fixPortalImageUrl(portal_cache.image);
        if (!latLng) latLng = portal_cache.latE6/1E6 + ',' + portal_cache.lngE6/1E6;
        // console.log('==KsysList from cache ' + portal_cache.title);// for DEBUG
      }
    }

    var data = (window.portals[key.guid] && window.portals[key.guid].options.data) || window.portalDetail.get(key.guid) || null;
    if (data) {
      if (data.title && data.title !== 'undefined' && !title) title = data.title;
      if (!imageUrl) imageUrl = window.fixPortalImageUrl(data.image);
      // console.log('==KsysList from view ' + data.title);// for DEBUG
    }
    var hLatLng = window.findPortalLatLng(key.guid);
    if (hLatLng && !latLng) {
      latLng = hLatLng.lat + ',' + hLatLng.lng;
    }

    if (imageUrl.indexOf('//') === 0) {
      imageUrl = 'http:' + imageUrl;
    }
    if (imageUrl.indexOf(DEFAULT_PORTAL_IMG) !== -1) {
      imageUrl = '';
    }

    if (latLng) {
      key.intelMapUrl = self.INTEL_URL + '?ll=' + latLng + '&z=' + self.DEFAULT_ZOOM_LEVEL + '&pll=' + latLng;
    } else {
      key.intelMapUrl = '';
    }

    // fail over
    if (!title) {
      title = '(not detected)';
    }
    if (!latLng) {
      latLng = '0,0';
    }

    key.title = title;
    key.latLng = latLng;
    key.imageUrl = imageUrl;
    key.annotation = annotation;

    return key;
  };

  self._csvValue = function(str) {
    if (str) {
      return '"' + str.replace(/\"/g, '""') + '"';
    } else {
      return '';
    }
  };

  self.eachKey = function(key) {
    if (key.count > 0) {
      key = self.getPortalDetails(key);
      var csvline = [
        self._csvValue(key.title),
        parseInt(key.count, 10),
        self._csvValue(key.latLng),
        self._csvValue(key.intelMapUrl),
        self._csvValue(key.imageUrl),
        self._csvValue(key.annotation),
        key.guid
      ];
      self.listAll.push(csvline.join(','));
    }
  };

  self.renderList = function() {
    self.listAll = [];
    // cache.loadFromLocal();// for DEBUG

    // if the Keys plugin is not available, quit now
    if (!window.plugin.keys) {
      return console.warn('[KeysList] This plugin is dependent on the Keys plugin.');
    }

    $.each(plugin.keys.keys, function(key, count) {
      self.eachKey({'guid': key, 'count': count});
    });

    var content = self.CSV_HEADER + "\n" + self.listAll.join("\n");
    var blob = new Blob([content], {'type': 'text/csv'});
    var filename = self.createCsvFilename();
    var url = window.URL || window.webkitURL;

    var html = $('<div>');
    var p = $('<p>').text('KeysList for ' + window.PLAYER.nickname + ' ' + self.listAll.length + ' portals in keys. ');
    var a = $('<a>').attr({'download': filename, 'href': url.createObjectURL(blob)}).text('Export CSV');
    var pre = $('<pre>').addClass('keysListCSV').text(content);
    a.appendTo(p);
    p.appendTo(html);
    pre.appendTo(html);

    dialog({
      title: 'KeysList',
      html: html.html(),
      width: 550,
      position: {my: 'right center', at: 'center-60 center', of: window, collision: 'fit'}
    });
    // console.log('==KeysList ' + self.listAll.length);// for DEBUG
    // cache.storeToLocal();// for DEBUG
  };

  self._num2str = function(num) {
    var nums = num.toString();
    if (nums.length === 2) {
      return '' + nums;
    } else {
      return '0' + nums;
    }
  };

  self.createCsvFilename = function() {
    var now = new Date();
    var dt = now.getFullYear() + self._num2str(now.getMonth() + 1) + self._num2str(now.getDate()) +
        self._num2str(now.getHours()) + self._num2str(now.getMinutes()) + self._num2str(now.getSeconds());
    return 'KeysList_' + window.PLAYER.nickname + '_' + dt + '.csv';
  };

  self.setupCSS = function() {
    $('<style>')
      .prop('type', 'text/css')
      .html('.keysListCSV {width: 500px; height: 300px; overflow-y: scroll; overflow-x: hidden; background: white; color: black;}')
      .appendTo('head');
  };

  var setup = function() {
    self.setupCSS();
    $('#toolbox').append('<a onclick="window.plugin.keysList.renderList();" title="Export Keys List">KeysList</a>');
    if (iitcVersionNumber => '20151111074206') {
      addHook('iitcLoaded',        window.plugin.cachePortalDetailsOnMap.loadFromLocal);
      addHook('mapDataRefreshEnd', window.plugin.cachePortalDetailsOnMap.storeToLocal);
    }
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
