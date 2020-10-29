/* global L, lat, lon, geoserverUrl */

const map = new L.Map('map', {
  center: new L.LatLng(lat, lon),
  zoom: 13,
  minZoom: 4,
  touchZoom: true
});

const rasterWMS = geoserverUrl + 'geoserver/raster/wms';
const vectorWMS = geoserverUrl + 'geoserver/vector/wms';

// Background map
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Basemap
const waterways = L.tileLayer.wms(vectorWMS, {
  layers: 'osm_waterways',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 1
});

const roads = L.tileLayer.wms(vectorWMS, {
  layers: 'osm_roads',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 1
});

const buildings = L.tileLayer.wms(vectorWMS, {
  layers: 'osm_buildings',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 1
});

const basemapBbox = L.tileLayer.wms(vectorWMS, {
  layers: 'basemap_bbox',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 1
});

// Selection
const selection = L.tileLayer.wms(vectorWMS, {
  layers: 'selection',
  format: 'image/png',
  transparent: true,
  legend: true,
  maxZoom: 20,
  minZoom: 1
});

// Time map module
const fromPoints = L.tileLayer.wms(vectorWMS, {
  layers: 'time_map_from_points',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 3
});

const viaPoints = L.tileLayer.wms(vectorWMS, {
  layers: 'time_map_via_points',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 3
});

const strickenArea = L.tileLayer.wms(vectorWMS, {
  layers: 'time_map_stricken_area',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 3
});

const timeMap = L.tileLayer.wms(rasterWMS, {
  layers: 'time_map_result',
  format: 'image/png',
  transparent: true,
  maxZoom: 20,
  minZoom: 1
});

// Latacunga thematic maps
const floodRiskMap = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:ltca_flood_risk',
  format: 'image/png',
  transparent: true,
  legend: true,
  maxZoom: 20,
  minZoom: 3
});

const hospitals = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:ltca_hospitals',
  format: 'image/png',
  transparent: true,
  legend: true,
  maxZoom: 20,
  minZoom: 3
});

const doctors = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:ltca_doct_offices',
  format: 'image/png',
  transparent: true,
  legend: true,
  maxZoom: 20,
  minZoom: 3
});

const schools = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:ltca_schools',
  format: 'image/png',
  transparent: true,
  legend: true,
  maxZoom: 20,
  minZoom: 3
});

const farms = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:ltca_farms',
  format: 'image/png',
  transparent: true,
  legend: true,
  maxZoom: 20,
  minZoom: 3
});

const greenhouses = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:ltca_greenhouses',
  format: 'image/png',
  transparent: true,
  legend: true,
  maxZoom: 20,
  minZoom: 3
});

const administrativeUnits = L.tileLayer.wms(vectorWMS, {
  layers: 'vector:ltca_admin',
  format: 'image/png',
  transparent: true,
  legend: true,
  maxZoom: 20,
  minZoom: 3
});

const latacungaElevationMap = L.tileLayer.wms(rasterWMS, {
  layers: 'raster:ltca_dem',
  format: 'image/png',
  transparent: true,
  legend: true,
  maxZoom: 20,
  minZoom: 3
});

// Drawings
const drawnItems = L.featureGroup().addTo(map);

// Control for map legends. For those item, where the linked map has a "legend: true," property, a second checkbox will displayed.
L.control.legend(
  { position: 'bottomleft' }
).addTo(map);

// Overlay layers are grouped
const groupedOverlays = {
  "Background map": {
    "OpenStreetMap": osm
  },
  "Basemap": {
    "Waterways": waterways,
    "Roads": roads,
    "Buildings": buildings,
    "Basemap boundary": basemapBbox,
    "Current selection": selection
  },
  "Time map": {
    "Start point": fromPoints,
    "Via point": viaPoints,
    "Affected area": strickenArea,
    "Road-level time map": timeMap
  }
};

const customLayers = {
  "Latacunga": {
    "Elevation map": latacungaElevationMap,
    "8th level administrative units": administrativeUnits,
    "Flood risk map": floodRiskMap,
    "Greenhouses": greenhouses,
    "Farms and orchards": farms,
    "School": schools,
    "Doctor and dentists": doctors,
    "Hospitals and clinics": hospitals
  },
}

// Use the custom grouped layer control, not "L.control.layers"
L.control.groupedLayers({}, groupedOverlays, { position: 'topright', collapsed: false }).addTo(map);

L.control.groupedLayers({}, customLayers, { position: 'topright', collapsed: false }).addTo(map);

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

// Save drawed items in feature group
map.on(L.Draw.Event.CREATED, (event) => {
  drawnItems.addLayer(event.layer);
});

/* scale bar */
L.control.scale({ maxWidth: 300, position: 'bottomright' }).addTo(map);
