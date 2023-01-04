// @todo keyboard a11y
// @todo Filters/search
// @todo Fix number sort
// @todo alt text field?
// @todo Get preferred rows and columns from Jess
// @todo warn about SVGs in Pantheon 1
// @todo add button to submit request
// @todo There may be less bandwidth from Jess, does there need to be a warning on new requests?
// @todo Standards if you make your own
// @todo Are there any issues like "this diagram can't be used"? Good reason not to put this on prod.
// @todo Usage instructions for images on the webpage?
// @todo Feature requests for the listing page?

// Dependencies
const buildCsv = require('./modules/build-csv');
const buildLandingPage = require('./modules/build-landing-page');

// Config
const dir = {
  'compiled': 'for-web/',
  'source': 'source/',
};

const run = () => {
  console.log(`Indexing files in ${dir.compiled}...`);
  // Crawl the compiled folder for files and populate data
  const fileMetadata = buildCsv.crawlDir(dir.compiled);
  const indexedFilesCount = Object.keys(fileMetadata).length;
  console.log(`Indexed ${indexedFilesCount} file${ indexedFilesCount > 1 ? 's' : ''}.\n`);
  buildCsv.processLocalAssetsTsv(fileMetadata, buildLandingPage.buildIndexHtml);
};

run();
