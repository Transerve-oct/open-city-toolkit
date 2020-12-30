/* global $, L, t, lat, lon, geoserverUrl, services */

const map = new L.Map('map', {
  center: new L.LatLng(lat, lon),
  zoom: 13,
  minZoom: 4,
  touchZoom: true,
  measureControl: true
});

const vectorWMS = geoserverUrl + '/vector/wms';

// Base layers
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const waterLines = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:water_lines_osm',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 1
});

const roads = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:lines_osm',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 1
});

const buildings = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:polygons_osm',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 1
});

const selection = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:selection',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 1
});

// Drawings
const drawnItems = L.featureGroup().addTo(map);

// extension layers
const queryArea1 = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:query_area_1',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 1
});

const strickenArea = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:m1_stricken_area',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 3
});

const timeMap = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:m1_time_map',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 1
});

const fromPoints = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:m1_from_points',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 3
});

const viaPoints = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:m1_via_points',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 3
});

const toPoints = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:m1_to_points',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 3
});

const accessibilityMap = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:m1b_accessibility_map',
  format: 'image/png',
  transparent: true,
  legend_yes: true,
  maxZoom: 20,
  minZoom: 3
});

const accessibilityPoints = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:m1b_points',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 3
});

const queryMap = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:query_map',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 3
});

const queryResult = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:query_result',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 3
});

/**
 * WFS
 */
const owsrootUrl = 'http://localhost:8080/geoserver/ows';

const defaultParameters = {
  service: 'WFS',
  request: 'GetFeature',
  typeName: 'vector:lines_osm',
  outputFormat: 'application/json',
  SrsName: 'EPSG:4326'
};
const parameters = L.Util.extend(defaultParameters);
const URL = owsrootUrl + L.Util.getParamString(parameters);
let WFSLayer = null;

const ajax = $.ajax({
  type: 'GET',
  url: URL,
  success: function (response) {
    WFSLayer = L.geoJson(response, {
      style: function (feature) { },
      onEachFeature: function (feature, layer) {
        popupOptions = { maxWidth: 200 };
        const text = Object.keys(feature.properties).map(key => `${key}: ${feature.properties[key]}`).join('<br>')
        layer.bindPopup(text
          , popupOptions);
      }
    }).addTo(map);
  }
});


//Control for map legends. For those item, where the linked map has a "legend_yes: true," property, a second checkbox will displayed.
L.control.legend(
  { position: 'bottomleft' }
).addTo(map);

// Helper function to translate keys in layer control definitions
function translate(layerObject) {
  return Object.entries(layerObject).reduce((translated, [key, value]) => {
    translated[t[key]] = value;
    return translated;
  }, {});
}

// Grouped layer control
const baseLayers = translate({
  "OSM Standard style": osm,
  "OSM Humanitarian style": hot
})

// Configure the layer switcher
let groupedOverlays = {}
const groups = [...new Set(services.map(ser=>ser.group))]
for(const group of groups){
  groupedOverlays[group] = {}
}
for(const service of services){
  // make layers available in the global scope
  window[service.layers] = createWms(service)
  groupedOverlays[service.group][t[service.displayName]] = window[service.layers]
}
groupedOverlays = translate(groupedOverlays)

// Use the custom grouped layer control, not "L.control.layers"
L.control.groupedLayers(baseLayers, groupedOverlays, { position: 'topright', collapsed: false }).addTo(map);

// Prevent click/scroll events from propagating to the map through the layer control
const layerControlElement = $('.leaflet-control-layers')[0];
L.DomEvent.disableClickPropagation(layerControlElement);
L.DomEvent.disableScrollPropagation(layerControlElement);

map.addControl(new L.Control.Draw({
  edit: {
    featureGroup: drawnItems,
    poly: {
      allowIntersection: false
    }
  },
  draw: {
    polygon: {
      showArea: true,
      fill: '#FFFFFF',
    },
    polyline: false,
    rectangle: false,
    circle: false,
    marker: false,
    circlemarker: true
  }
}));

//Measure tool
const options = {
  position: 'topleft',
  activeColor: '#080A06 !important',
  completedColor: '#000000'
}
var measureControl = new L.Control.Measure(options);
measureControl.addTo(map)

// Save drawed items in feature group
map.on(L.Draw.Event.CREATED, (event) => {
  drawnItems.addLayer(event.layer);
});

/* scale bar */
L.control.scale({ maxWidth: 300, position: 'bottomright' }).addTo(map);

// eslint-disable-next-line no-unused-vars
function refreshLayer(layer) {
  // Force reloading of the layer
  layer.setParams({ ts: Date.now() });
}

/**
 * create wms service based on serviceConf
 * @param {object} service config object from config.js
 */
function createWms(service) {
  return service.type === 'vector' ? L.tileLayer.betterWms(vectorWMS, service) : L.tileLayer.betterWms(rasterWMS, service)
}
