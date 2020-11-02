const { execSync } = require('child_process') // Documentation: https://nodejs.org/api/child_process.html
const fs = require('fs')

const GEOSERVER = `${process.env.GEOSERVER_DATA_DIR}/data`
const GRASS = process.env.GRASS_DIR
const outputDir = process.env.OUTPUT_DIR

module.exports = {
  /**
   * Import an OSM map file into a GRASS mapset.
   * @param {string} mapset
   * @param {string} infile file to import
   * @param {string} layer layer name
   * @param {string} outfile output filename
   */
  addOsm(mapset, infile, layer, outfile) {
    grass(mapset, `v.in.ogr -o input="${infile}" layer="${layer}" output="${outfile}" --overwrite`)
  },

  /**
   * Import a raster map file into a GRASS mapset.
   * @param {string} mapset
   * @param {string} infile file to import
   * @param {string} outfile output filename
   */
  addRaster(mapset, infile, outfile) {
    grass(mapset, `r.import input="${infile}" output="${outfile}" --overwrite`)
  },

  /**
   * Import a vector map file into a GRASS mapset.
   * @param {string} mapset
   * @param {string} infile file to import
   * @param {string} outfile output filename
   */
  addVector(mapset, infile, outfile) {
    grass(mapset, `v.import input="${infile}" output="${outfile}" --overwrite`)
  },

  checkWritableDir(path) {
    try {
      fs.accessSync(path, fs.constants.W_OK)
    } catch (err) {
      throw new Error(`Cannot launch module: ${path} is not writable.`)
    }
  },

  /**
   * Clip a map layer using the bounds of another layer
   * @param {string} mapset
   * @param {string} layer the layer to clip
   * @param {string} clipLayer the layer whose bounds are used for clipping
   * @param {string} outfile output filename
   */
  clip(mapset, layer, clipLayer, outfile) {
    grass(mapset, `v.clip input=${layer} clip=${clipLayer} output=${outfile} --overwrite`)
  },

  /**
   * Get the center coordinates of the current selection.
   * @param {string} mapset
   * @returns {[number, number]} center coordinates (east, north)
   */
  getCoordinates(mapset) {
    let EAST, NORTH
    let list = grass(mapset, `g.list type=vector`).trim()
    let region

    if (list.split('\n').indexOf('selection') > -1) {
      region = grass(mapset, `g.region -cg vector=selection`).trim()
    } else {
      region = grass(mapset, `g.region -cg vector=polygons_osm`).trim()
    }

    EAST = region.split('\n')[0].split('=')[1]
    NORTH = region.split('\n')[1].split('=')[1]

    return [EAST, NORTH]
  },

  /**
   * Get a layer's attribute columns
   * @param {string} mapset mapset
   * @param {string} layer layer name
   */
  getColumns(mapset, layer) {
    return grass(mapset, `db.describe -c table=${layer}`).trim().split('\n')
      .filter(line => line.match(/^Column/))
      .map(line => {
        const matches = line.match(/Column \d+: ([^:]+):([^:]+):(\d+)/)
        return {
          name: matches[1],
          type: matches[2],
          width: matches[3]
        }
      })
      .filter(col => col.name !== 'cat')
  },

  /**
   * Get a layer's numeric attribute columns
   * @param {string} mapset mapset
   * @param {string} layer layer name
   */
  getNumericColumns(mapset, layer) {
    return grass(mapset, `db.describe -c table=${layer}`).trim().split('\n').filter(col => col.match(/DOUBLE PRECISION|INTEGER/) && !col.match(/cat/i))
  },

  /**
   * Returns univariate statistics on selected table column for a GRASS vector map.
   * @param {string} mapset 
   * @param {string} map 
   * @param {string} column 
   */
  getUnivar(mapset, map, column) {
    const rawArray = grass(mapset, `v.db.univar -e -g map=${map} column=${column}`).trim().split('\n')
    return rawArray.reduce((dict, line) => {
      const a = line.split('=')
      dict[a[0]] = a[1]
      return dict
    }, {})
  },

  /**
   * Returns min and max value of a univariate stat on selected table column for a GRASS vector map.
   * @param {string} mapset 
   * @param {string} map 
   * @param {string} column 
   */
  getUnivarBounds(mapset, map, column) {
    const stats = module.exports.getUnivar(mapset, map, column)
    return [round(stats.min, 2), round(stats.max, 2)]
  },

  /**
   * Identify the topology of a vector map
   * @param {string} mapset
   * @param {string} layer layer name
   * @returns {string} topology type (possible values are: point, line, area, mixed, empty)
   */
  getTopology(mapset, layer) {
    const info = grass(mapset, `v.info -t map=${layer}`).trim().split('\n').reduce((dict, line) => {
      const a = line.split('=')
      dict[a[0]] = a[1]
      return dict
    }, {})

    const topology = info.points ? (info.lines || info.centroids ? 'mixed' : 'point') : info.lines ? (info.centroids ? 'mixed' : 'line') : info.centroids ? 'area' : 'empty'
    return topology
  },

  /**
   * Export a vector map as a GeoPackage file in the GeoServer data directory.
   * @param {string} mapset
   * @param {string} infile file to import
   * @param {string} outfile output filename
   */
  gpkgOut(mapset, infile, outfile) {
    grass(mapset, `v.out.ogr format=GPKG input="${infile}" output="${GEOSERVER}/${outfile}.gpkg" --overwrite`)
  },

  /**
   * Overwrite the region of the given mapset. If no such mapset exists, create it
   * @param {string} mapset
   */
  initMapset(mapset) {
    if (!fs.existsSync(`${GRASS}/global/${mapset}`)) {
      fs.mkdirSync(`${GRASS}/global/${mapset}`)
    }
    fs.copyFileSync(`${GRASS}/global/PERMANENT/WIND`, `${GRASS}/global/${mapset}/WIND`)

    for (const file of fs.readdirSync(`${GRASS}/skel`)) {
      fs.copyFileSync(`${GRASS}/skel/${file}`, `${GRASS}/global/${mapset}/${file}`)
    }
  },

  /**
   * List available vector maps
   * @param {string} mapset
   * @return {string[]} names of available maps
   */
  listVector(mapset) {
    return grass(mapset, `g.list type=vector`).trim().split('\n')
  },

  /**
   * Check if a mapset exists
   * @param {string} mapset
   * @returns {boolean} true if mapset exists
   */
  mapsetExists(mapset) {
    let exists = true
    try {
      grass(mapset, `g.list type=vector`)
    } catch (err) {
      exists = false
    }
    return exists
  },

  /**
   * Merge multiple PDF files into one
   * @param {string} outfile
   * @param  {...string} infiles
   */
  mergePDFs(outfile, ...infiles) {
    infiles = infiles.map(file => `"${file}"`).join(" ")
    execSync(`gs -dBATCH -dNOPAUSE -q -sDEVICE=pdfwrite -dPDFSETTINGS=/prepress -sOutputFile="${outfile}" ${infiles}`)
  },

  /**
   * Remove a map layer
   * @param {string} mapset
   * @param {string} layer layer name
   */
  remove(mapset, layer) {
    grass(mapset, `g.remove -f type=vector name=${layer}`)
  },

  /**
   * Convert PS to PDF
   * @param {string} infile
   * @param {string} outfile
   */
  psToPDF(infile, outfile) {
    execSync(`ps2pdf ${infile} ${outfile}`)
  },

  /**
   * Convert text to PS
   * @param {string} infile
   * @param {string} outfile
   */
  textToPS(infile, outfile) {
    execSync(`enscript -p ${outfile} ${infile}`)
  },

  /**
   * Prints all attribute descriptions of a table
   * @param {string} table
   */
  describeTable(mapset, table) {
    const raw = grass(mapset, `db.describe table="${table}"`)
    const desc = parseDescription(raw)
    addBounds(desc, mapset, table)
    return JSON.stringify(desc)
  },

  /**
   * Prints all the result files in the 'output' folder
   * @returns {array} list of result filenames
   */
  getResults() {
    const list = []
    fs.readdirSync(outputDir).forEach(file => {
      list.push(file)
    })
    return list
  },

  grass
}

/**
 * Run any GRASS command on a given mapset
 * @param {string} mapset
 * @param {string} args arguments to the command line
 */
function grass(mapset, args) {
  return execSync(`grass "${GRASS}/global/${mapset}" --exec ${args}`, { shell: '/bin/bash', encoding: 'utf-8' })
}

/**
 * Parse raw stream from db.describe
 * @param {string} raw
 */
function parseDescription(raw) {
  const rawArray = raw.split('\n\n')
  const desc = {
    tableObj: formatDesc(rawArray.slice(0, 1)),
    columnObj: formatDesc(rawArray.slice(1))
  }
  return desc
}

/**
 * add max and min attributes to each element of desc.columnObj.rows
 * @param {*} desc table description object
 * @param {*} mapset mapset name
 * @param {*} table table name
 */
function addBounds(desc, mapset, table) {
  desc.columnObj.rows.forEach(row => {
    if (['DOUBLE PRECISION', 'INTEGER'].indexOf(row.type) > -1) {
      const [min, max] = module.exports.getUnivarBounds(mapset, table, row.column)
      row.min = min
      row.max = max
    }
  })
}

/**
 * format array of description items into a table object
 * @param {Array} rawArray 
 */
function formatDesc(rawArray) {
  const table = { headFields: [], rows: [] }
  table.headFields = rawArray[0].split('\n').map(line => line.split(':')[0])
  table.headFields.push('min', 'max')
  for (const column of rawArray) {
    const row = column.split('\n').reduce((obj, line) => {
      const [key, value] = line.split(':')
      obj[key] = value
      return obj
    }, {})
    table.rows.push(row)
  }
  return table
}

function round(val, n) {
  let i = 0
  let dot = false
  while (val[i] && ['0', '.'].indexOf(val[i]) > -1) {
    if (val[i] === '.') dot = true
    i++
  }
  if (!dot) {
    while (val[i] && val[i] != '.') i++
  }
  return val.substring(0, i + n + 1)
}
