require("dotenv").config();
const { getTrulia } = require("./getTrulia");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const ObjectsToCsv = require("objects-to-csv");

(async () => {
  console.log("Fetching 2 users...");
  const user_1 = await getTrulia(process.env.EMAIL, process.env.PASSWORD);
  const user_2 = await getTrulia(process.env.EMAIL_2, process.env.PASSWORD_2);

  console.log("Combining users & removing duplicates...");
  let houses = user_1;
  houses.map((house, index) => {
    if (
      house.address != undefined &&
      user_2[index].houses != undefined &&
      house.address != user_2[index].address
    ) {
      houses.push(user_2[index]);
    }
  });

  console.log("Authorizing Google Sheets...");
  const doc = new GoogleSpreadsheet(process.env.SHEET_ID);
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
  });

  console.log("Getting sheet...");
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];

  console.log("Clearing old rows...");
  const rows = await sheet.getRows();
  await rows.map((row, index) => {
    if (index != 0) {
      row.delete();
    }
  });

  console.log("Adding to Google Sheets...");
  await sheet.addRows(houses);

  console.log("Complete! Outputting to CSV.");
  const csv = new ObjectsToCsv(houses);
  csv.toDisk("./houses.csv");
})();
