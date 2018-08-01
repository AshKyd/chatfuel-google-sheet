const sheet = require("../functions/lib/sheet");

sheet.auth({ force: true }, (error, thing, token) => {
  console.log("token follows:");
  console.log(JSON.stringify(token, null, 2));
  if (error) console.error(error);
});
