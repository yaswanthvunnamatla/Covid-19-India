const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
app.use(express.json())
const dbPath = path.join(__dirname, 'covid19India.db')

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () =>
      console.log('Server Running at http://localhost:3000/'),
    )
  } catch (error) {
    console.error('DB Error: ${error.message}')
    process.exit(1)
  }
}
const convertStateDbToResponse = dbObject => ({
  stateId: dbObject.state_id,
  stateName: dbObject.state_name,
  population: dbObject.population,
})

const convertDistrictDbToResponse = dbObject => ({
  districtId: dbObject.district_id,
  districtName: dbObject.district_name,
  stateId: dbObject.state_id,
  cases: dbObject.cases,
  cured: dbObject.cured,
  active: dbObject.active,
  deaths: dbObject.deaths,
})

app.get('/states/', async (request, response) => {
  const getStatesQuery = `
    SELECT * FROM state ORDER BY state_id
    `
  const statesArray = await db.all(getStatesQuery)
  response.send(
    statesArray.map(state => ({
      stateId: state.state_id,
      stateName: state.state_name,
      population: state.population,
    })),
  )
})

app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const statesQuery = `
      SELECT state_id AS stateId, state_name AS stateName, population FROM state WHERE state_id = ${stateId};
  `
  const getStatesArray = await db.get(statesQuery)
  response.send(getStatesArray)
})

app.post('/districts/', async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const createDistrictQuery = `
      INSERT INTO district (district_name, state_id, cases, cured, active, deaths)
      VALUES ('${districtName}',${stateId},${cases},${cured},${active},${deaths});
  `
  await db.run(createDistrictQuery)
  response.send('District Successfully Added')
})

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const stateQuery = `
      SELECT district_id AS districtId, district_name AS districtName, state_id AS 
      stateId, cases,cured,active,deaths FROM district WHERE district_id = ${districtId};
  `
  const getStates = await db.get(stateQuery)
  response.send(getStates)
})

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteQuery = `DELETE FROM district WHERE district_id = ${districtId}`
  await db.run(deleteQuery)
  response.send('District Removed')
})

app.put('/districts/:districtId/', async (req, res) => {
  const {districtId} = req.params
  const {districtName, stateId, cases, cured, active, deaths} = req.body
  const updateQuery = `
  UPDATE district 
  SET 
  district_name = '${districtName}', 
  state_id = ${stateId}, 
  cases = ${cases}, 
  cured = ${cured}, 
  active = ${active},
   deaths = ${deaths} 
   WHERE district_id = ${districtId}
  `
  await db.run(updateQuery)
  res.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (req, res) => {
  const {stateId} = req.params
  const query = `
  SELECT SUM(cases) AS totalCases, 
  SUM(cured) AS totalCured, 
  SUM(active) AS totalActive, 
  SUM(deaths) AS totalDeaths
   FROM district WHERE state_id = ${stateId}
  `
  const stats = await db.get(query)
  res.send(stats)
})

app.get('/districts/:districtId/details/', async (req, res) => {
  const {districtId} = req.params
  const getQuery = `
  SELECT state.state_name AS stateName 
  FROM state JOIN district ON state.state_id = district.state_id 
  WHERE district.district_id = ${districtId}
  `
  const stateName = await db.get(getQuery)
  res.send(stateName)
})

initializeDBAndServer()
module.exports = app
