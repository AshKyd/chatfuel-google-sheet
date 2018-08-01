const sheet = require("./lib/sheet");
const createRows = require("./lib/createRows");
const functions = require("firebase-functions");

const DEFAULT_REPLY = "";

function defaultReply(error, callback) {
  console.error(error);
  return callback(null, defaultReply);
}

function getKey({ key, sheetId }, callback) {
  console.log("gettin");
  sheet.read(sheetId, {}, (error, rows) => {
    console.log("returned", !!callback);
    if (error) return defaultReply("Error: " + error.message, callback);
    if (!rows || !rows.length)
      return defaultReply("No rows returned", callback);
    const result = rows.find(
      row => String(row[0]).trim() === String(key).trim()
    );
    if (!result) {
      console.log(rows.map(row => row[0]).join(","));
      return defaultReply("No result found.", callback);
    }
    return callback(null, result[1]);
  });
}

exports.sheetsAppend = functions.https.onRequest((request, response) => {
  const config = request.query;
  const body = request.body;

  const sheetId = config.id;
  const rows = createRows(config, body);

  if (!sheetId) {
    return response
      .status(200)
      .set("content-type", "application/json")
      .send({ statusCode: 200, body: "Specify a spreadsheet with ?id=xxx" });
  }

  sheet.append(sheetId, rows, error => {
    console.log(sheetId, rows, error);
    if (error) throw error;
  });

  // return a blank callback because we don't need to block user input here
  return response
    .status(200)
    .set("content-type", "application/json")
    .send({});
});

exports.sheetsGetKey = functions.https.onRequest((req, res) => {
  const sheetId = req.query.id || req.query.spreadsheetId;
  const key = req.body[Object.keys(req.body)[0]];

  if (!sheetId) {
    console.error(`missing sheetId in ${JSON.stringify(req.query)}`);
    return res
      .status(400)
      .set("content-type", "application/json")
      .send({
        statusCode: 200,
        body: "Specify a spreadsheet to search through with ?id=xxx"
      });
  }

  if (!key) {
    console.error(`missing key in ${JSON.stringify(req.body)}`);
    return res
      .status(400)
      .set("content-type", "application/json")
      .send({
        statusCode: 200,
        body:
          'Specify a key in the body with a payload {anyKeyName: "the value we use"}'
      });
  }

  return getKey({ sheetId, key }, (error, responseText) => {
    console.log("got key, sending response");
    res
      .status(200)
      .set("content-type", "application/json")
      .send({
        messages: [{ text: responseText }]
      });
  });
});
