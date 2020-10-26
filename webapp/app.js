// Read config
require('dotenv').config()

const dataFromBrowserDir = process.env.DATA_FROM_BROWSER_DIR
const geoserverDataDir = process.env.GEOSERVER_DATA_DIR
const geoserverUrl = process.env.GEOSERVER_URL
const lat = process.env.INITIAL_LAT || 0
const lon = process.env.INITIAL_LON || 0

// File system
const fs = require('fs')

// Express server
const express = require('express')
require('pug')
const app = express()
const expressPort = 3000

// Middleware
const jsonParser = require('body-parser').json()
const multer = require('multer')
const uploadParser = multer()

app.listen(expressPort, () => {
  console.log(`App listening on port ${expressPort}`)
})

// Static files
app.use(express.static('public'))
app.use('/output', express.static('../output'))
app.use('/lib/jquery', express.static('node_modules/jquery/dist'));
app.use('/lib/bootstrap', express.static('node_modules/bootstrap/dist'));
app.use('/lib/leaflet', express.static('node_modules/leaflet/dist'));
app.use('/lib/leaflet-draw', express.static('node_modules/leaflet-draw/dist'));
app.use('/lib/leaflet-groupedlayercontrol', express.static('node_modules/leaflet-groupedlayercontrol/src'));

// Views (using Pug template engine)
app.set('views', './views')
app.set('view engine', 'pug')

// index page
app.get('/', (req, res) => {
  let options = {
    geoserverUrl,
    lat,
    lon
  }
  res.render('launch', options)
})

// modules
const AddLocationModule = require('./scripts/add_location')
const AddMapModule = require('./scripts/add_map')
const SetSelectionModule = require('./scripts/set_selection')
const SetResolutionModule = require('./scripts/set_resolution')
const ModuleOne = require('./scripts/module_1')
const ModuleOneA = require('./scripts/module_1a')
const ModuleTwo = require('./scripts/module_2')
const LatacungaModule = require('./scripts/cotopaxi_scenarios')
const { describeTable, getResults } = require('./scripts/functions')

const modules = {
  add_location: new AddLocationModule(),
  add_map: new AddMapModule(),
  set_selection: new SetSelectionModule(),
  set_resolution: new SetResolutionModule(),
  module_1: new ModuleOne(),
  module_1a: new ModuleOneA(),
  module_2: new ModuleTwo(),
  cotopaxi_scenarios: new LatacungaModule()
}

// launch a module
app.post('/launch', jsonParser, (req, res, next) => {
  // do some checks first
  if (!dataFromBrowserDir) {
    throw new Error("Cannot launch module: DATA_FROM_BROWSER_DIR is not defined.")
  }
  if (!geoserverDataDir) {
    throw new Error("Cannot launch module: GEOSERVER_DATA_DIR is not defined.")
  }

  try {
    res.send(modules[req.body.launch].launch())
  } catch (err) {
    next(err)
  }
})

// message request
app.post('/reply', jsonParser, (req, res, next) => {
  try {
    const module = modules[req.query.message_id.split('.')[0]]
    const message = module.process(req.body.msg, req.query.message_id)

    if (message) {
      res.send(message)
    } else {
      next("Something went wrong")
    }
  } catch (err) {
    next(err)
  }
})

// file upload
app.post('/file', uploadParser.single('file'), (req, res, next) => {
  try {
    const module = modules[req.query.message_id.split('.')[0]]
    const file = `${dataFromBrowserDir}/${req.file.originalname}`
    const writer = fs.createWriteStream(file)

    writer.write(req.file.buffer, (error) => {
      if (error) {
        next(error)
      }
      writer.close()

      // Process file after it's finished downloading.
      // Have to add another try/catch block, as we're inside an async function
      try {
        const message = module.process(file, req.query.message_id)

        if (message) {
          res.send(message)
        } else {
          next("Something went wrong")
        }
      } catch (err) {
        next(err)
      }
    })
  } catch (err) {
    next(err)
  }
})

// send a GeoJSON
app.post('/drawing', jsonParser, (req, res, next) => {
  try {
    const module = modules[req.query.message_id.split('.')[0]]
    const file = `${dataFromBrowserDir}/drawing.geojson`

    fs.writeFileSync(file, JSON.stringify(req.body.data))
    res.send(module.process(file, req.query.message_id))
  } catch (err) {
    next(err)
  }
})

// return all output filenames
app.get('/output', jsonParser, (req, res, next) => {
  try {
    const list = getResults()
    const message = { message_id: 'output', message: { list } }
    res.send(message)
  } catch (err) {
    next(err)
  }
})

// return all attribute descriptions of a table
app.get('/attributes', jsonParser, async (req, res, next) => {
  try {
    const attributes = await describeTable(req.query.table)
    const message = { message_id: 'attributes', message: { attributes } }
    res.json(message)
  } catch (err) {
    next(err)
  }
})

// error handler
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err)
  }
  res.status(500)

  // GRASS errors
  let grassError = ''
  if (err.message.match(/Starting GRASS GIS/)) {
    let errorMessageOngoing = false
    for (const line of err.message.split('\n')) {
      const errorMatch = line.match(/^ERROR/)
      if (errorMatch) {
        errorMessageOngoing = true
      }
      if (!errorMatch && !line.match(/^\s/)) {
        errorMessageOngoing = false
      }
      if (errorMessageOngoing) {
        grassError += line + ' '
      }
    }
  }

  res.json({ message: grassError || err.message })
})
