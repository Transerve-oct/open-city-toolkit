/* eslint-disable no-undef */

const map = new L.Map('map', {
  center: new L.LatLng(lat, lon),
  zoom: 13,
  minZoom: 4,
  touchZoom: true
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

const drawnItems = L.featureGroup().addTo(map);

//Extension layers
const query_area_1 = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:query_area_1',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 1
});

const Stricken_Area = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:m1_stricken_area',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 3
});

const TimeMap = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:m1_time_map',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 1
});

const FromPoints = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:m1_from_points',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 3
});

const ViaPoints = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:m1_via_points',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 3
});

const ToPoints = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:m1_to_points',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 3
});

const AccessibilityMap = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:m1b_accessibility_map',
  format: 'image/png',
  transparent: true,
  legend_yes: true,
  maxZoom: 20,
  minZoom: 3
});

const AccessibilityPoints = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:m1b_points',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 3
});

const Query_map = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:query_map',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 3
});

const Query_result = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:query_result',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 3
});

//Control for map legends. For those item, where the linked map has a "legend_yes: true," property, a second checkbox will displayed.
L.control.legend(
  { position: 'bottomleft' }
).addTo(map);

// Overlay layers are grouped
const groupedOverlays = {
  "Basemaps":{
    'OpenStreetMap': osm
  },
  "Location": {
    'Water lines': waterLines,
    'Roads': roads,
    'Buildings': buildings,
  },
  "User inputs":{
    'Current selection': selection,
    'Drawings on the map': drawnItems,
    'Query area': query_area_1,
    'Query map': Query_map,
    "From-points": FromPoints,
    "Via-points": ViaPoints,
    "To-points": ToPoints,
    "Stricken area": Stricken_Area
  },
  "Results": {
    "Road-level time map": TimeMap,
    'Query result': Query_result,
    "Accessibility map": AccessibilityMap,
    "Accessing points": AccessibilityPoints
  }
};

// Use the custom grouped layer control, not "L.control.layers"
L.control.groupedLayers({}, groupedOverlays, { position: 'topright', collapsed: false }).addTo(map);

map.addControl(new L.Control.Draw({
  edit: {
    featureGroup: drawnItems,
    poly: { allowIntersection: false }
  },
  draw: {
    polygon: {
      allowIntersection: false,
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

// Save drawed items in feature group
map.on(L.Draw.Event.CREATED, (event) => {
  drawnItems.addLayer(event.layer);
});

/* scale bar */
L.control.scale({ maxWidth: 300, position: 'bottomright' }).addTo(map);
