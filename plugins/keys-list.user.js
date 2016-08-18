// ==UserScript==
// @id             iitc-plugin-keys-list@isnot
// @name           IITC plugin: Keys List
// @category       Keys
// @version        0.2.20160817
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @author         isnot
// @updateURL      none
// @downloadURL    none
// @description    [20160817] Show the manually entered key counts from the 'keys' plugin.
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

  // if the Keys plugin is not available, quit now
  if (!window.plugin.keys) {
    return console.warn("[KeysList] This plugin is dependent on the Keys plugin being present.");
  }

  // use own namespace for plugin
  window.plugin.keysList = function() {};
  var self = window.plugin.keysList;
  self.listAll = [];
  self.cache   = {};
  self.localStrageKey = "plugin-KeysList-cache";

  // fetch a portal name from a cached list if available
  self.getPortalDetails = function getPortalDetails(key) {
    var name = "(not detected)";
    var latLng = '"0,0"';
    var portal = window.portals[key.guid];

    // try plugin cache
    if (self.cache[key.guid]) {
      name = self.cache[key.guid];
    }

    if (portal) {
      name = portal.options.data.title;
      // cache for later
      self.cache[key.guid] = name;

      var hLatLng = portal.getLatLng();
      if (hLatLng.lat && hLatLng.lng) {
        latLng = '"' + hLatLng.lat + ',' + hLatLng.lng + '"';
      }
    }

    key.name = name;
    key.latLng = latLng;

    return key;
  };

  self.eachKey = function(key) {
    if (key.count > 0) {
      key = self.getPortalDetails(key);
      var keyNameCsvValue = '"' + key.name + '"';
      var csvline = [keyNameCsvValue, key.count, key.latLng, key.guid];
      self.listAll.push(csvline.join(","));
      // console.log("==KeysList " + key.name);
    }
  };

  self.renderList = function() {
    self.listAll = [];

    // if an existing portal cache, load it
    if (window.localStorage[self.localStrageKey]) {
      self.cache = JSON.parse(window.localStorage[self.localStrageKey]);
      // make a new cache
    } else {
      window.localStorage[self.localStrageKey] = "{}";
    }

    $.each(plugin.keys.keys, function(key, count) {
      self.eachKey({"guid": key, "count": count});
    });

    localStorage.setItem(self.localStrageKey, JSON.stringify(self.cache));
    var html = '<textarea cols="78" rows="20">KeysList,' + window.PLAYER.nickname + "," + new Date().toISOString() + "," + self.listAll.length + "\nname,count,latlng,guid\n" + self.listAll.join("\n") + "</textarea>";
    dialog({
      title: 'KeysList',
      html: html,
      width: 600,
      position: {my: 'right center', at: 'center-60 center', of: window, collision: 'fit'}
    });
    // alert("KeysList," + window.PLAYER.nickname + "," + new Date().toISOString() + "," + self.listAll.length + "\nname,count,latlng,guid\n" + self.listAll.join("\n"));
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
