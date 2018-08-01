const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
const gal = require("google-auth-library");
const env = require("../env");

const tokenFile = require("path").join(__dirname, "../token.json");

const sheetModule = {
  auth() {
    const callback = arguments[arguments.length - 1];
    const options = typeof arguments[0] !== "function" ? arguments[0] : {};
    const { force } = options;

    function getNewToken(oAuth2Client, callback) {
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/spreadsheets"]
      });
      console.log("Authorize this app by visiting this url:", authUrl);
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question("Enter the code from that page here: ", code => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
          if (err) return callback(err);
          oAuth2Client.setCredentials(token);

          fs.writeFile(tokenFile, JSON.stringify(token), err => {
            if (err) console.error(err);
            console.log("Token stored to ", tokenFile);
          });
          callback(null, oAuth2Client);
        });
      });
    }

    function authorize(credentials, aCallback) {
      const { client_secret, client_id, redirect_uris } = credentials.installed;
      const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      // Check if we have previously stored a token.
      fs.readFile(tokenFile, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(null, oAuth2Client);
      });
    }

    const secrets = {
      installed: {
        client_id: env.SHEETS_CLIENT_ID,
        project_id: env.SHEETS_PROCESS_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://accounts.google.com/o/oauth2/token",
        auth_provider_x509_cert_url:
          "https://www.googleapis.com/oauth2/v1/certs",
        client_secret: env.SHEETS_CLIENT_SECRET,
        redirect_uris: ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"]
      }
    };

    return authorize(secrets, callback);
  },

  /**
   * Print the names and majors of students in a sample spreadsheet:
   * https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
   */
  append(spreadsheetId, row, callback) {
    sheetModule.auth((error, oauth2Client) => {
      if (error) throw error;
      const sheets = google.sheets("v4");
      sheets.spreadsheets.values.append(
        {
          spreadsheetId,
          auth: oauth2Client,
          range: "Sheet1",
          valueInputOption: "USER_ENTERED",
          resource: {
            values: [row]
          }
        },
        err => {
          if (err)
            return callback(new Error(`The API returned an error: ${err}`));
          return callback();
        }
      );
    });
  },

  read(spreadsheetId, options, callback) {
    sheetModule.auth((error, oauth2Client) => {
      const sheets = google.sheets("v4");
      sheets.spreadsheets.values.get(
        {
          spreadsheetId,
          auth: oauth2Client,
          range: "Sheet1!A2:E"
        },
        (err, response) => {
          if (err)
            return callback(new Error(`The API returned an error: ${err}`));
          const rows = response.data.values;
          return callback(null, rows);
        }
      );
    });
  }
};

module.exports = sheetModule;
