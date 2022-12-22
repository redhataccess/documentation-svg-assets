console.clear();

// Dependencies
const fs = require('fs');
const path = require('path');
const { parse } = require("csv-parse");
const { stringify } = require("csv-stringify");
const { execSync } = require('child_process');

// @todo keyboard a11y
// @todo Filters/search
// @todo Fix number sort
// @todo alt text field?
// @todo warn about SVGs in Pantheon 1
// @todo add button to submit request
// @todo There may be less bandwidth from Jess, does there need to be a warning on new requests?
// @todo Standards if you make your own
// @todo Are there any issues like "this diagram can't be used"? Good reason not to put this on prod.
// @todo Usage instructions for images on the webpage?
// @todo Feature requests for the listing page?

// Config
const dir = {
  'compiled': 'for-web/',
  'source': 'source/',
};
const localAssetsTsvPath = './data/localAssets.tsv';
const indexPagePath = './for-web/index.html';
const tsvDelimeter = '\t';
const pageTitle = 'Documentation Diagram Library';

// crawlDir Data vars
const filesByFolder = {};
const fileMetadata = {};

// TSV data vars
let tsvHeaders;
const tsvFileFullPaths = [];
const tsvRows = [];

/**
 * Runs a command in the CLI and returns the output
 * @link https://stackoverflow.com/a/12941186
 * @param {string} command CLI command
 * @param {function} callback Function to pickup command output
 */
const runCliCommand = (command, callback) => {
  const stdout = execSync(command);
  if (stdout) {
    let output;
    if (typeof stdout === 'string') {
      output = stdout;
    }
    else if (typeof stdout.toString === 'function') {
      output = stdout.toString();
    }
    else {
      console.warn('Unable to get string value of command ouptut.', stdout);
      return;
    }
    callback(output);
  }
};

/**
 * Recursive function that finds all files in a dir and populates filesByFolder and fileMetadata.
 * @param {string} dirToCrawl Path to crawl for files
 */
const crawlDir = (dirToCrawl) => {
  const files = fs.readdirSync(dirToCrawl);
  if (!fs.existsSync(dirToCrawl)) {
    console.warn('Invalid directory given during crawl.', dirToCrawl);
  }

  files.forEach((fileName) => {
    const fullPath = path.join(dirToCrawl, fileName);
    const stat = fs.lstatSync(fullPath);
    if (stat.isDirectory()) {
      // Don't find or list assets from our landing page assets folder
      if (fileName !== '_listing-page-assets') {
        crawlDir(fullPath);
      }
    }
    else {
      if (typeof filesByFolder[dirToCrawl] === 'undefined') {
        filesByFolder[dirToCrawl] = [fileName];
      }
      // Get the 2nd path and assume it's a product name (e.g. for-web/RHEL, use RHEL)
      const productName = fullPath.split('/')[1];
      const extension = fullPath.split('.').pop();

      // Extensions to skip
      switch (extension.toLowerCase()) {
        case 'js':
        case 'css':
        case 'html':
          return;
      }

      // Add the file metadata for inclusion in the TSV
      filesByFolder[dirToCrawl].push(fileName);
      fileMetadata[fullPath] = {
        'productName': productName,
        'extension': extension,
        'fileName': fileName,
        'fileSize': fs.statSync(fullPath).size,
      };
    }
  });
};

/**
 * Compare data in TSV to files in the compiled folder and make sure each file is represented in the TSV
 */
const getNewTsvRows = () => {
  if (!fileMetadata, !Object.keys(fileMetadata).length) {
    console.error('Missing required data from fileMetadata.', fileMetadata);
  }
  if (!tsvHeaders || !tsvRows) {
    console.error('Missing required data from localAssets.tsv', 'tsvHeaders: ', tsvHeaders, 'tsvRows: ', tsvRows);
  }

  const localFullFilePaths = Object.keys(fileMetadata);
  const rowsToAddToTsv = [];

  localFullFilePaths.forEach((fullPath) => {
    if (tsvFileFullPaths.indexOf(fullPath) >= 0) {
      // console.log('Not adding to TSV', fullPath);
      return;
    }

    if (!fileMetadata[fullPath]) {
      console.warn(`Tried to add ${fullPath}, but could't get it's file data`, fileMetadata[fullPath]);
    }
    else {
      // Create an array with the same number of indexes as there are TSV columns
      const rowToAdd = Array(tsvHeaders.length);
      const currentFileMetadata = fileMetadata[fullPath];
      const metadataKeys = Object.keys(currentFileMetadata);

      // Set the fullPath column
      rowToAdd[tsvHeaders.indexOf('fullPath')] = fullPath;

      // Find the appropriate column index to set the value for known metadata
      metadataKeys.forEach((metadataKey) => {
        let tsvColumnIndex;

        // Handle any special mapping
        switch (metadataKey) {
          case 'productName':
            tsvColumnIndex = tsvHeaders.indexOf('relatedProducts');
            break;
          default:
            tsvColumnIndex = tsvHeaders.indexOf(metadataKey);
            break;
        }

        // Set the metadata to the correct column
        if (tsvColumnIndex >= 0) {
          rowToAdd[tsvColumnIndex] = currentFileMetadata[metadataKey];
        }
        else {
          console.warn(`Couldn't find a column in the TSV for ${metadataKey}, columns are:`, tsvHeaders);
        }
      });

      let createdDate = '';
      runCliCommand(
        `git log --format=%ad --date=iso "${fullPath}"`,
        (stdout) => {
          // if (error) console.error('Encountered git error when trying to retrieve git created date', error);
          // if (stderr) console.error('Encountered git error when trying to retrieve git created date', stderr);
          if (stdout) {
            // We expect the first characters to follow this format YYYY-MM-DD
            createdDate = stdout.substring(0, 10);
            // Test our assumption
            if (!/\d{4}-\d{2}-\d{2}/.test(createdDate)) {
              // Wipe the date if it's not the format we expect
              createdDate = '';
            }
          }
        }
      );

      const createdDateIndex = tsvHeaders.indexOf('createdDate');
      if (createdDate.length) {
        rowToAdd[createdDateIndex] = createdDate;
      }

      // Debug output
      // console.log('----------');
      // tsvHeaders.forEach((value, index) => console.log(value, rowToAdd[index]));
      rowsToAddToTsv.push(rowToAdd);
    }
  });
  return rowsToAddToTsv;
}

/**
 * Creates the HTML for a table based on arrays
 * @param {array} headerRow Column headings as an array
 * @param {array} rows An array of arrays with the latter being the values for each cell in a row
 * @returns {string} the HTML for the table
 */
const createListingTable = (headerRow, rows) => {
  if (!Array.isArray(headerRow) || !headerRow.length) {
    console.error('Tried to build HTML table for index page without a headerRow', 'headerRow: ', headerRow, 'rows: ', rows);
    return;
  }
  if (!Array.isArray(rows) || !rows.length) {
    console.error('Tried to build HTML table for index page without rows', 'headerRow: ', headerRow, 'rows: ', rows);
    return;
  }

  const fullPathIndex = headerRow.indexOf('fullPath');
  // Remove full path column
  headerRow.splice(fullPathIndex, 1);
  // Add new preview column
  headerRow = ['Preview'].concat(headerRow);

  // Get column number of sortable columns
  const fileSizeIndex = headerRow.indexOf('fileSize');
  const fileNameIndex = headerRow.indexOf('fileName');
  const relatedProductsIndex = headerRow.indexOf('relatedProducts');
  const extensionIndex = headerRow.indexOf('extension');
  const createdDateIndex = headerRow.indexOf('createdDate');

  const sortableColumns = [
    fileNameIndex + 1,
    relatedProductsIndex + 1,
    extensionIndex + 1,
    createdDateIndex + 1,
    fileSizeIndex + 1,
  ];

  // Setup web component wrapper and start table and table head
  let table = `<rh-table full-screen="false" sortable="${sortableColumns.join(',')}"><table><thead><tr>\n`;

  // Create table headers
  headerRow.forEach((heading) => {
    // Convert machine friendly names to human friendly names
    switch (heading) {
      case 'fileName':
        heading = 'File Name';
        break;
      case 'relatedProducts':
        heading = 'Related Products';
        break;
      case 'createdDate':
        heading = 'Created Date';
        break;
      case 'fileSize':
        heading = 'File Size (kb)';
        break;
      case 'extension':
        heading = 'Extension';
    }
    // Write out HTML
    table = `${table}<th>${heading}</th>\n`;
  });
  // Close table head
  table = `${table}</tr></thead>\n`;

  // Populate rows of the table from rows data
  rows.forEach((currentRow) => {
    // Start table row
    table = `${table}<tr>`;

    // Make first column the preview image
    if (typeof currentRow[fullPathIndex] === 'string' && currentRow[fullPathIndex].length) {
      let fullPath = currentRow[fullPathIndex];

      // Remove for-web from path since HTML file is in that folder
      const startsWithForWeb = fullPath.indexOf('for-web/') === 0;
      if (startsWithForWeb) fullPath = fullPath.substring(8);

      // Create img tag
      const previewImg = `<img tabindex="0" data-src="${fullPath}" alt="" class="preview-image js-lazy-load" />`;
      currentRow = [previewImg].concat(currentRow);
    }
    // Or an empty cell if we can't make the image
    else {
      currentRow = [''].concat(currentRow);
    }

    // Remove fullPath column
    currentRow.splice(fullPathIndex + 1, 1);

    // Add HTML for this row
    currentRow.forEach((cell, index) => {
      // Start array for classes on td with column header class name
      const cellClasses = [`column--${headerRow[index]}`];

      // Add warning or error class for files with large sizees
      if (index === fileSizeIndex) {
        // Convert bytes into kilobytes
        cell = Math.round(parseInt(cell) / 1000);
        // Mark 500kb as an 'error'
        if (cell > 300) {
          cellClasses.push('error');
        }
        // Warn for 150kb and up
        else if (cell > 150) {
          cellClasses.push('warning');
        }
      }

      // Build attributes as string
      const attributes = ` class="${cellClasses.join(' ')}"`;
      // Write out table cell with attributes and data
      table = `${table}<td${attributes}>${cell}</td>\n`;
    });
    // Complete the row
    table = `${table}</tr>`;
  });
  // Complete table tags
  table = `${table}</table></rh-table>`;
  return table;
}

/**
 * Builds an index html page listing all of the diagrams
 * @param {array} headerRow Column headings as an array
 * @param {array} rows An array of arrays with the latter being the values for each cell in a row
 */
const buildIndexHtml = (headerRow, rows) => {
  console.log('Starting web page build...');
  const indexPage = fs.createWriteStream(indexPagePath);

  indexPage.once('open', () => {
    const table = createListingTable(headerRow, rows);
    if (table) {
      let indexHtml =          `<!DOCTYPE html><html><head>`;
      indexHtml = `${indexHtml}\n  <title>${pageTitle} - Red Hat</title>`;
      indexHtml = `${indexHtml}\n  <link media="all" rel="stylesheet" type="text/css" href="_listing-page-assets/@patternfly/pfe-styles/dist/pfe-base.min.css" />`;
      indexHtml = `${indexHtml}\n  <link media="all" rel="stylesheet" type="text/css" href="_listing-page-assets/@patternfly/pfe-styles/dist/red-hat-font.min.css" />`;
      indexHtml = `${indexHtml}\n  <link media="all" rel="stylesheet" type="text/css" href="_listing-page-assets/@cpelements/rh-table/dist/rh-table--lightdom.css" />`;
      indexHtml = `${indexHtml}\n  <link media="all" rel="stylesheet" type="text/css" href="_listing-page-assets/styles.css" />`;
      indexHtml = `${indexHtml}\n  <script src="_listing-page-assets/@cpelements/rh-table/dist/rh-table.min.js" type="module"></script>`;
      indexHtml = `${indexHtml}\n  <script src="_listing-page-assets/script.js"></script>`;
      indexHtml = `${indexHtml}</head>`;
      indexHtml = `${indexHtml}\n<body>`;
      indexHtml = `${indexHtml}\n  <h1>${pageTitle}</h1>${table}`;
      indexHtml = `${indexHtml}</body></html>`;
      indexPage.end(indexHtml);
    }

    console.log('Successfully built web page.');
  });
};

/**
 * Process the TSV file and get the relevant data
 */
const processLocalAssetsTsv = () => {
  console.log('Processing TSV data...');
  let tsvRowCount = 1;

  /**
   * Process a row of data from TSV
   * @param {array} row Data from TSV row
   */
  const processTsvRow = (row) => {
    if (tsvRowCount === 1) {
      tsvHeaders = row;
    }
    else {
      // Populate tsvRows with data
      tsvRows.push(row);
      // Populate tsvFileFullPaths
      const fullPathHeaderIndex = tsvHeaders.indexOf('fullPath');
      if (!fullPathHeaderIndex) {
        console.error('Couldn\'t get the column id for fullPath in TSV Header', tsvHeaders);
        return;
      }
      else {
        const fullPath = row[fullPathHeaderIndex].trim();
        if (fullPath) {
          tsvFileFullPaths.push(fullPath);
        }
        else {
          console.warn('Couldn\'t get fullPath for row.', 'Row: ', row, 'Headers:', tsvHeaders, 'fullPathHeaderIndex: ', fullPathHeaderIndex);
        }
      }
    }
    tsvRowCount++;
  };

  const postTsvProcessing = () => {
    // Subtracting one for header row, and one because the count starts at 1
    console.log(`Processed ${tsvRowCount - 2} files from TSV.\n`);

    // Figure out what files are new
    console.log('Comparing indexed files to files in TSV...');
    const newTsvRows = getNewTsvRows();

    // If we have new rows, update the TSV then build the index page
    if (Array.isArray(newTsvRows) && newTsvRows.length) {
      const localAssetsTsvStream = fs.createWriteStream(localAssetsTsvPath);
      localAssetsTsvStream.once('open', () => {
        console.log(`Adding ${newTsvRows.length} file${ newTsvRows.length > 1 ? 's' : '' } to the TSV...`);
        const allRows = tsvRows.concat(newTsvRows);

        // Write existing rows back
        const convertToTsv = stringify({ header: true, columns: tsvHeaders, delimiter: tsvDelimeter });
        tsvRows.forEach((row) => convertToTsv.write(row));

        // Add new rows
        if (newTsvRows.length) newTsvRows.forEach((row) => convertToTsv.write(row));
        convertToTsv.pipe(localAssetsTsvStream);
        console.log('TSV updated.\n');

        buildIndexHtml(tsvHeaders, allRows);
      });
    }
    // Otherwise just create the index page
    else {
      console.log(`No new files to add to the TSV.\n`);
      buildIndexHtml(tsvHeaders, tsvRows);
    }
  };

  // Kick off TSV processing
  fs.createReadStream(localAssetsTsvPath)
    .pipe(parse({delimiter: tsvDelimeter, from_line: 1 }))
    .on('error', (error) => {
      console.warn(error);
    })
    .on('data', processTsvRow)
    .on('end', postTsvProcessing);
};

const run = () => {
  console.log(`Indexing files in ${dir.compiled}...`);
  // Crawl the compiled folder for files and populate data
  crawlDir(dir.compiled);
  const indexedFilesCount = Object.keys(fileMetadata).length;
  console.log(`Indexed ${indexedFilesCount} file${ indexedFilesCount > 1 ? 's' : ''}.\n`);
  processLocalAssetsTsv();
};

run();