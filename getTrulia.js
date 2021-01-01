const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

const options = {
  headless: true,
  defaultViewport: null,
};

async function getTrulia(EMAIL, PASSWORD) {
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
  await page.type("input[data-testid=auth-login-email-input]", EMAIL);
  await page.type("input[data-testid=auth-login-password-input]", PASSWORD);
  await page.click("[data-testid=auth-login-submit]");

  console.log("Logged in! Going to saved homes...");
  await page.waitForNavigation();
  await page.goto("https://trulia.com/account/properties", {
    waitUntil: "networkidle2",
  });

  var loading = process.env.LOADING == 1 ? true : false;
  if (loading) {
    console.log("Loading in all houses...");
  } else {
    console.log("Loading in first set of houses...");
  }

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

  console.log("Gathering data...");
  await page.waitForSelector("[data-testid=saved-homes-list]");
  const houses = await page.evaluate(() => {
    var list = document.querySelector("[data-testid=saved-homes-list]");
    var arr = [];

    function getText(el, attr) {
      const item = el.querySelector(`[data-testid=${attr}]`);
      if (item != null || item != undefined) {
        return item.innerText;
      }
    }

    function getImage(el) {
      const img = el.querySelector("[data-testid=property-image-0] img");
      if (img != null || img != undefined) {
        return img.src;
      }
    }

    function getLink(el) {
      const link = el.querySelector("[data-testid=home-card-sale] a");
      if (link != null || link != undefined) {
        return link.href;
      }
    }

    function getStatus(el) {
      const status = el.querySelector("[data-testid=property-tag-0] span");
      const status_if_new = el.querySelector(
        "[data-testid=property-tag-1] span"
      );
      if (status != null || status != undefined) {
        if (status_if_new != null || status_if_new != undefined) {
          return `${status.innerText}, ${status_if_new.innerText}`;
        } else {
          return status.innerText;
        }
      }
    }

    Array.from(list.children).forEach((el) => {
      if (el != null || el != undefined) {
        var house = {
          image: getImage(el),
          price: getText(el, "property-price"),
          beds: getText(el, "property-beds"),
          baths: getText(el, "property-baths"),
          rooms: `${getText(el, "property-beds")}, ${getText(
            el,
            "property-baths"
          )}`,
          sqft: getText(el, "property-floorSpace"),
          address: `${getText(el, "property-street")} ${getText(
            el,
            "property-region"
          )}`,
          address_l1: `${getText(el, "property-street")}`,
          address_l2: `${getText(el, "property-region")}`,
          status: getStatus(el),
          trulia: getLink(el),
        };
      }
      arr.push(house);
    });
    return arr;
  });

  console.log("Closing browser.");
  await browser.close();
  return houses;
}

module.exports.getTrulia = getTrulia;
