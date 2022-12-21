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
const csvDelimeter = '\t';

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
      crawlDir(fullPath);
    }
    else {
      if (typeof filesByFolder[dirToCrawl] === 'undefined') {
        filesByFolder[dirToCrawl] = [fileName];
      }
      else {
        filesByFolder[dirToCrawl].push(fileName);
        fileMetadata[fullPath] = {
          'productName': fullPath.split('/')[1],
          'extension': fullPath.split('.').pop(),
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
    console.error('Missing required data from localAssets.csv', 'csvHeaders: ', csvHeaders, 'csvRows: ', csvRows);
  }

  const localFullFilePaths = Object.keys(fileMetadata);
  const rowsToAddToCsv = [];

  localFullFilePaths.forEach((fullPath) => {
    if (csvFileFullPaths.indexOf(fullPath) >= 0) {
      console.log('Not adding to CSV', fullPath);
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
      console.log('----------');
      csvHeaders.forEach((value, index) => console.log(value, rowToAdd[index]));
      rowsToAddToCsv.push(rowToAdd);
    }
  });

  return rowsToAddToCsv;
}

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
    console.log(newCsvRows);
    debugger;

    // Write new rows to CSV
    const writableStream = fs.createWriteStream(localAssetsCsvPath);
    if (Array.isArray(newCsvRows) && newCsvRows.length) {
      const convertToCsv = stringify({ header: true, columns: csvHeaders, delimiter: csvDelimeter });
      // Write existing rows back
      csvRows.forEach((row) => convertToCsv.write(row));
      // Add new rows
      newCsvRows.forEach((row) => convertToCsv.write(row));
      convertToCsv.pipe(writableStream);
    }
  });
