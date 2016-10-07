// ==UserScript==
// @id             iitc-plugin-keys-list@isnot
// @name           IITC plugin: Keys List
// @category       Keys
// @version        0.8.20160903
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @author         isnot
// @updateURL      https://github.com/isnot/iitc-plugin-keys-list/raw/master/plugins/keys-list.user.js
// @downloadURL    https://github.com/isnot/iitc-plugin-keys-list/raw/master/plugins/keys-list.user.js
// @description    [iitc-plugins] Export the manually entered key counts from the 'keys' plugin.
// @include        https://*.ingress.com/intel*
// @include        http://*.ingress.com/intel*
// @match          https://*.ingress.com/intel*
// @match          http://*.ingress.com/intel*
// @include        https://*.ingress.com/mission/*
// @include        http://*.ingress.com/mission/*
// @match          https://*.ingress.com/mission/*
// @match          http://*.ingress.com/mission/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
  // ensure plugin framework is there, even if iitc is not yet loaded
  if (typeof window.plugin !== 'function') window.plugin = function() {};

  // PLUGIN START ////////////////////////////////////////////////////////

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

  // fetch a portal info
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
    if (window.plugin.cachePortalDetailsOnMap && window.plugin.cacheLocal && window.plugin.cacheLocal.cache_local_is_loaded) {
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

    var filename = self.createCsvFilename();
    var content = self.CSV_HEADER + "\n" + self.listAll.join("\n");
    var blob = new Blob([content], {'type': 'text/csv'});
    var url = window.URL || window.webkitURL;
    var blob_url = url.createObjectURL(blob);
    var a = $('<a>').text('Export CSV');

    if (window.isTouchDevice()) {
      a.click(function(){
        var file_reader = new FileReader();
        file_reader.onload = function(e){
          $('<a>').attr({'target': '_blank', 'download': filename, 'href': file_reader.result}).appendTo($('body')).click().remove();
          //anchor.parentNode.removeChild(anchor);
        };
        file_reader.readAsDataURL(blob);
      });
    } else {
      a.attr({'download': filename, 'href': blob_url});
    }

    var html = $('<div>');
    var p = $('<p>').text('KeysList for ' + window.PLAYER.nickname + ' ' + self.listAll.length + ' portals in keys. ');
    var pre = $('<pre>').addClass('keysListCSV').text(content);
    a.appendTo(p);
    p.appendTo(html);
    pre.appendTo(html);

    dialog({
      title: 'KeysList',
      html: html.html(),
      width: 480,
      position: {my: 'right center', at: 'center-60 center', of: window, collision: 'fit'}
    });
    // console.log('==KeysList ' + self.listAll.length);// for DEBUG
    // cache.storeToLocal();// for DEBUG
  };

  self.createCsvFilename = function() {
    var now = new Date();
    var dt = now.getFullYear() + window.zeroPad(now.getMonth() + 1, 2) + window.zeroPad(now.getDate(), 2) +
        window.zeroPad(now.getHours(), 2) + window.zeroPad(now.getMinutes(), 2) + window.zeroPad(now.getSeconds(), 2);
    return 'KeysList_' + window.PLAYER.nickname + '_' + dt + '.csv';
  };

  self.setupCSS = function() {
    $('<style>')
      .prop('type', 'text/css')
      .html('.keysListCSV {width: 450px; height: 260px; overflow-y: scroll; overflow-x: hidden; background: white; color: black;}')
      .appendTo('head');
  };

  var setup = function() {
    self.setupCSS();
    $('#toolbox').append('<a onclick="window.plugin.keysList.renderList();" title="Export Keys List">KeysList</a>');
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
