require("dotenv").config();
const { getTrulia } = require("./getTrulia");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const ObjectsToCsv = require("objects-to-csv");

(async () => {
  console.log("Fetching 2 users...");
  const user_1 = await getTrulia(process.env.EMAIL, process.env.PASSWORD);
  const user_2 = await getTrulia(process.env.EMAIL_2, process.env.PASSWORD_2);

  console.log("Combining users & removing duplicates...");
  const all_houses = [...user_1, ...user_2];
  const houses = Array.from(new Set(all_houses));

  console.log("Authorizing Google Sheets...");
  const doc = new GoogleSpreadsheet(process.env.SHEET_ID);
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
  });

  console.log("Getting sheet...");
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  const combSheet = doc.sheetsByIndex[1];

  console.log("Clearing old rows...");
  const rows = await sheet.getRows();
  await rows.map((row, index) => {
    if (index != 0) {
      row.delete();
    }
  });

  console.log("Adding to Google Sheets...");
  await sheet.addRows(houses);
  // await combSheet.addRows(user_1);
  // await combSheet.addRows(user_2);

  console.log("Complete! Outputting to CSV.");
  const csv = new ObjectsToCsv(houses);
  const combCsv = new ObjectsToCsv(all_houses);
  csv.toDisk("./houses.csv");
  combCsv.toDisk("./comb-houses.csv");
})();
