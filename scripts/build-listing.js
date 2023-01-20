// @todo keyboard a11y
// @todo Filters/search
// @todo Fix number sort
// @todo alt text field?
// @todo Get preferred rows and columns from Jess
// @todo warn about SVGs in Pantheon 1
// @todo add button to submit request
// @todo There may be less bandwidth from Jess, does there need to be a warning on new requests?
// @todo Standards if you make your own? This will probably be a future thing, Jess is working with LucidCharts
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
  console.log(`Indexing files in ${dir.compiled}...`);0
  // Crawl the compiled folder for files and populate data
  const fileMetadata = buildCsv.crawlDir(dir.compiled);
  const indexedProductsCount = Object.keys(fileMetadata).length;
  let indexedFiles = []
  for (const product in fileMetadata) {
    if (Object.hasOwnProperty.call(fileMetadata, product)) {
      const filesArr = Object.keys(fileMetadata[product]);
      indexedFiles = indexedFiles.concat(filesArr)
    }
  }
  const indexedFilesCount = indexedFiles.length;
  console.log(`Indexed ${indexedFilesCount} file${ indexedFilesCount > 1 ? 's' : ''} from ${indexedProductsCount} product${ indexedProductsCount > 1 ? 's' : ''}.\n`);
  buildCsv.processLocalAssetsTsv(fileMetadata, buildLandingPage.buildPages);
};

run();
