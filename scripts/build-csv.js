console.clear();
// Dependencies
const fs = require('fs');
const path = require('path');
const { parse } = require("csv-parse");
const { stringify } = require("csv-stringify");

// Config
const dir = {
  'compiled': './for-web/',
  'source': './source/',
};
const localAssetsCsvPath = './data/localAssets.tsv';
const indexPagePath = './for-web/index.html';
const csvDelimeter = '\t';
const pageTitle = 'Documentation Diagram Library';

// crawlDir Data vars
const filesByFolder = {};
const fileMetadata = {};

// CSV data vars
let csvHeaders;
let csvRow = 1;
const csvFileFullPaths = [];
const csvRows = [];

/**
 * Recursive function that finds all files in a dir and populates filesByFolder and fileMetadata.
 * @param {string} dirToCrawl Path to crawl for files
 */
const crawlDir = (dirToCrawl) => {
  const files = fs.readdirSync(dirToCrawl);
  if (!fs.existsSync(dirToCrawl)) {
    console.warn('Invalid directory.', dirToCrawl);
  }

  files.forEach((fileName) => {
    const fullPath = path.join(dirToCrawl, fileName);
    const stat = fs.lstatSync(fullPath);
    if (stat.isDirectory()) {
      if (fileName !== '_listing-page-assets') {
        crawlDir(fullPath);
      }
    }
    else {
      // Get the 2nd path and assume it's a product name (e.g. for-web/RHEL, use RHEL)
      const productName = fullPath.split('/')[1];
      const extension = fullPath.split('.').pop();

      if (typeof filesByFolder[dirToCrawl] === 'undefined') {
        filesByFolder[dirToCrawl] = [fileName];
      }
      else {
        filesByFolder[dirToCrawl].push(fileName);
        fileMetadata[fullPath] = {
          'productName': productName,
          'extension': extension,
          'fileName': fileName,
          'fileSize': fs.statSync(fullPath).size,
        };
      }
    }
  });
};

// Crawl the compiled folder for files and populate data
crawlDir(dir.compiled);

console.log(filesByFolder);
console.log(fileMetadata);

/**
 * Compare data in CSV to files in the compiled folder and make sure each file is represented in the CSV
 */
const getNewCsvRows = () => {
  if (!fileMetadata, !Object.keys(fileMetadata).length) {
    console.error('Missing required data from fileMetadata.', fileMetadata);
  }
  if (!csvHeaders || !csvRows) {
    console.error('Missing required data from localAssets.tsv', 'csvHeaders: ', csvHeaders, 'csvRows: ', csvRows);
  }

  const localFullFilePaths = Object.keys(fileMetadata);
  const rowsToAddToCsv = [];

  localFullFilePaths.forEach((fullPath) => {
    if (csvFileFullPaths.indexOf(fullPath) >= 0) {
      // console.log('Not adding to CSV', fullPath);
      return;
    }

    if (!fileMetadata[fullPath]) {
      console.warn(`Tried to add ${fullPath}, but could't get it's file data`, fileMetadata[fullPath]);
    }
    else {
      // Create an array with the same number of indexes as there are CSV columns
      const rowToAdd = Array(csvHeaders.length);
      const currentFileMetadata = fileMetadata[fullPath];
      const metadataKeys = Object.keys(currentFileMetadata);

      // Set the fullPath column
      rowToAdd[csvHeaders.indexOf('fullPath')] = fullPath;

      // Find the appropriate column index to set the value for known metadata
      metadataKeys.forEach((metadataKey) => {
        let csvColumnIndex;

        // Handle any special mapping
        switch (metadataKey) {
          case 'productName':
            csvColumnIndex = csvHeaders.indexOf('relatedProducts');
            break;
          default:
            csvColumnIndex = csvHeaders.indexOf(metadataKey);
            break;
        }

        // Set the metadata to the correct column
        if (csvColumnIndex >= 0) {
          rowToAdd[csvColumnIndex] = currentFileMetadata[metadataKey];
        }
        else {
          console.warn(`Couldn't find a column in the CSV for ${metadataKey}, columns are:`, csvHeaders);
        }
      });
      // Debug output
      // console.log('----------');
      // csvHeaders.forEach((value, index) => console.log(value, rowToAdd[index]));
      rowsToAddToCsv.push(rowToAdd);
    }
  });

  return rowsToAddToCsv;
}

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
  headerRow = ['Preview'].concat(headerRow);

  let table = `<rh-table full-screen="false"><table><thead><tr>`;
  headerRow.forEach((heading) => {
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
      case 'fullPath':
        heading = 'Path';
        break;
      case 'fileSize':
        heading = 'File Size';
        break;
    }
    table = `${table}<th>${heading}</th>`;
  });
  table = `${table}</tr></thead>`;

  // Populate rows of the table
  rows.forEach((currentRow) => {
    table = `${table}<tr>`;
    if (typeof currentRow[fullPathIndex] === 'string' && currentRow[fullPathIndex].length) {
      let fullPath = currentRow[fullPathIndex];
      const startsWithForWeb = fullPath.indexOf('for-web/') === 0;
      if (startsWithForWeb) fullPath = fullPath.substring(8);
      const previewImg = `<img data-src="${fullPath}" alt="" class="preview-image" />`;
      currentRow = [previewImg].concat(currentRow);
    }
    else {
      currentRow = [''].concat(currentRow);
    }
    currentRow.forEach((cell) => {
      table = `${table}<td>${cell}</td>`;
    });
    table = `${table}</tr>`;
  });
  table = `${table}</table></rh-table>`;
  return table;
}

/**
 * Builds an index html page listing all of the diagrams
 * @param {array} headerRow Column headings as an array
 * @param {array} rows An array of arrays with the latter being the values for each cell in a row
 */
const buildIndexHtml = (headerRow, rows) => {
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
      indexHtml = `${indexHtml}</head>`;
      indexHtml = `${indexHtml}\n<body>`;
      indexHtml = `${indexHtml}\n  <h1>${pageTitle}</h1>${table}`;
      indexHtml = `${indexHtml}</body></html>`;
      indexPage.end(indexHtml);
    }
    debugger;
  });
};

/**
 * Process the CSV file and get the relevant data
 */
fs.createReadStream(localAssetsCsvPath)
  .pipe(parse({delimiter: csvDelimeter, from_line: 1 }))
  .on('error', (error) => {
    console.warn(error);
    // return;
  })
  .on('data', (row) => {
    if (csvRow === 1) {
      csvHeaders = row;
    }
    else {
      // Populate csvRows with data
      csvRows.push(row);
      // Populate csvFileFullPaths
      const fullPathHeaderIndex = csvHeaders.indexOf('fullPath');
      if (!fullPathHeaderIndex) {
        console.error('Couldn\'t get the column id for fullPath in CSV Header', csvHeaders);
        return;
      }
      else {
        const fullPath = row[fullPathHeaderIndex].trim();
        if (fullPath) {
          csvFileFullPaths.push(fullPath);
        }
        else {
          console.warn('Couldn\'t get fullPath for row.', 'Row: ', row, 'Headers:', csvHeaders, 'fullPathHeaderIndex: ', fullPathHeaderIndex);
        }
      }
    }
    csvRow++;
  })
  .on('end', () => {
    console.log(csvFileFullPaths);
    console.log(csvHeaders);
    console.log(csvRows);

    // Figure out what files are new
    const newCsvRows = getNewCsvRows();
    // console.log(newCsvRows);

    // If we have new rows, update the CSV then build the index page
    if (Array.isArray(newCsvRows) && newCsvRows.length) {
      const localAssetsTsvStream = fs.createWriteStream(localAssetsCsvPath);
      localAssetsTsvStream.once('open', () => {
        const allRows = csvRows.concat(newCsvRows);
        const convertToCsv = stringify({ header: true, columns: csvHeaders, delimiter: csvDelimeter });
        // Write existing rows back
        csvRows.forEach((row) => convertToCsv.write(row));
        // Add new rows
        if (newCsvRows.length) newCsvRows.forEach((row) => convertToCsv.write(row));
        convertToCsv.pipe(localAssetsTsvStream);
        buildIndexHtml(csvHeaders, allRows);
      });
    }
    // Otherwise just create the index page
    else {
      buildIndexHtml(csvHeaders, csvRows);
    }
  });
