const { addRaster, addVector, checkWritableDir, mapsetExists, gpkgOut } = require('./functions.js')
const { add_map: messages } = require('./messages.json')

const GEOSERVER = `${process.env.GEOSERVER_DATA_DIR}/data`

class AddMapModule {
  constructor() {
    this.mapType = '' // 'vector' or 'raster'
    this.mapFile = '' // filename of uploaded file
  }

  launch() {
    checkWritableDir(GEOSERVER)

    if (mapsetExists('PERMANENT')) {
      return messages["2"]
    }
    return messages["1"]
  }

  process(message, replyTo) {
    switch (replyTo) {
      case 'add_map.2':
        // uploaded file
        if (message.match(/\.geojson$|\.gpkg$|\.osm$/i)) {
          this.mapType = 'vector'
        } else if (message.match(/\.tiff?$|\.gtif$/i)) {
          this.mapType = 'raster'
        } else {
          throw new Error("Wrong file format - must be one of 'geojson', 'gpkg', 'osm', 'tif', 'tiff', 'gtif'")
        }

        this.mapFile = message
        return messages["3"]

      case 'add_map.3':
        if (!message.match(/^[a-zA-Z]\w*$/)) {
          throw new Error("Invalid map name. Use alphanumeric characters only")
        }

        if (!this.mapFile) {
          throw new Error("File not found")
        }

        if (this.mapType === 'vector') {
          addVector('PERMANENT', this.mapFile, message)
          gpkgOut('PERMANENT', message, message)
        } else if (this.mapType === 'raster') {
          addRaster('PERMANENT', this.mapFile, message)
        }
        return messages["4"]
    }
  }
}

module.exports = AddMapModule
