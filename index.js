require("dotenv").config();
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");
const ObjectsToCsv = require("objects-to-csv");

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

const options = {
  headless: false,
  defaultViewport: null,
};

(async () => {
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  await page.setViewport({
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
  });
  const agent =
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36";
  await page.setUserAgent(agent);

  console.log("Loading...");
  await page.goto("https://trulia.com/login", { waitUntil: "networkidle2" });

  console.log("Filling out form...");
  await page.waitForSelector("input[data-testid=auth-login-email-input]");
  await page.type(
    "input[data-testid=auth-login-email-input]",
    process.env.EMAIL
  );
  await page.type(
    "input[data-testid=auth-login-password-input]",
    process.env.PASSWORD
  );
  await page.click("[data-testid=auth-login-submit]");

  console.log("Logged in! Going to saved homes...");
  await page.waitForNavigation();
  await page.goto("https://trulia.com/account/properties", {
    waitUntil: "networkidle2",
  });

  console.log("Loading in all houses...");
  var loading = true;

  while (loading) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    try {
      await page.waitForXPath('//button[text()="Show More!"]', {
        timeout: 3000,
      });
    } catch {
      console.log("No more houses to load.");
      loading = false;
    }
  }

  if (loading == false) {
    console.log("Jumping back to the top...");
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
  }

  console.log("Gathering data...");
  await page.waitForSelector("[data-testid=saved-homes-list]");
  const houses = await page.evaluate(() => {
    var list = document.querySelector("[data-testid=saved-homes-list]");
    var arr = [];

    Array.from(list.children).forEach((el) => {
      if (el) {
        function getText(el, attr) {
          return el.querySelector(`[data-testid=${attr}]`).innerText;
        }
        var house = {
          // img: el.querySelector("[data-testid=property-image-0] img").src,
          price: getText(el, "property-price"),
          beds: getText(el, "property-beds"),
          baths: getText(el, "property-baths"),
          sqft: getText(el, "property-floorSpace"),
          address: `${getText(el, "property-street")} ${getText(
            el,
            "property-region"
          )}`,
        };
      }
      arr.push(house);
    });
    return arr;
  });

  console.log("Complete! Outputting to CSV.");
  const csv = new ObjectsToCsv(houses);
  csv.toDisk("./houses.csv");

  console.log("Closing browser.");
  await browser.close();
})();
