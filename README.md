# Home Search Helper

Wanted to filter/sort by certain attributes but Trulia doesn't allow that. So I scrape their data via Puppeteer and output to a CSV instead. This then gets uploaded to Google Drive, where it feeds an AppSheet app.

## Local Setup

- Create a .env file (copy the template)
- Fill out with your Trulia info
- Run `npm install`
- Run `node index.js`
