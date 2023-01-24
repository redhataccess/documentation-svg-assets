// Node Dependencies
const fs = require('fs');
const path = require('path');
const { parse } = require("csv-parse");
const { stringify } = require("csv-stringify");

// Local deps
const runCliCommand = require('./runCliCommand');

// Config
const localAssetsTsvPath = './data/localAssets.tsv';
const tsvDelimeter = '\t';

/**
 * Flat object with folder path as key and array of file (not folder) names inside.
 * For example:
 *    {
 *      'for-web/': ['file1.ext', 'file2.ext'],
 *      'for-web/folder-name': ['file3.ext', 'file4.ext', file5.ext],
 *    }
 * @typedef {Object} filesByFolderType
 * @property {Array.<string>} [folderPath]
 *    Path of directories with list of files
 */

/**
 * File metadata object
 * @typedef {Object} fileMetadataEntry
 * @property {string} extension
 * @property {string} fileName
 * @property {number} fileSize File size in bytes
 * @property {string} productName Product name from folder naming convention
 */

/**
 * Object with full file paths as keys and file metadata as the value
 * @typedef {Object} fileMetadataObject
 * @property {fileMetadataEntry} [fullPath] File metadata keyed by it's full path
 */

/**
 * Value returned by crawlDir with file listings by folder and file metadata
 * @typedef {Object} crawlDirReturn
 * @property {filesByFolderType} filesByFolder
 * @property {fileMetadataObject} fileMetadata
 */

/**
 * Recursive function that finds all files in a dir and populates filesByFolder and fileMetadata.
 * Don't pass filesByFolder or fileMetadata object unless you want to add onto an existing object.
 * Those params are intended for recursion in directory crawl.
 * @param {string} dirToCrawl Path to crawl for files
 * @param {filesByFolderType} filesByFolder Files in each folder, folder paths as keys, value is array of file (not folder) names
 * @param {fileMetadataObject} fileMetadata See typedef
 * @return {crawlDirReturn}
 */
const crawlDir = (dirToCrawl, filesByFolder, fileMetadata) => {
  // If we're recursing, build on
  filesByFolder = filesByFolder ? filesByFolder : {};
  fileMetadata = fileMetadata ? fileMetadata : {};

  const files = fs.readdirSync(dirToCrawl);
  if (!fs.existsSync(dirToCrawl)) {
    console.warn('Invalid directory given during crawl.', dirToCrawl);
  }

  // Iterate over files in this dir
  files.forEach((fileName) => {
    const fullPath = path.join(dirToCrawl, fileName);
    const stat = fs.lstatSync(fullPath);
    // If it's a dir crawl it with crawlDir
    if (stat.isDirectory()) {
      // Don't find or list assets from our landing page assets folder
      if (fileName !== '_listing-page-assets') {
        crawlDir(fullPath, filesByFolder, fileMetadata);
      }
    }
    else {
      // Instantiate key in the object if it doesn't exist
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

      // get rid of underscores and dashes and replace with spaces
      let fileNameCleaned = fileName.replace(/(_)+|(-)+/g," ");
      // split on the period before the file extension
      let fileNameArr = fileNameCleaned.split('.');
      // take the first item from the array, which will be the filename, 
      // and split it on spaces
      fileNameArr = fileNameArr[0].split(' ');
      // if the first item in the array is a number, remove it
      if (!isNaN(parseInt(fileNameArr[0]))) {
        fileNameArr.shift();
      }

      // Loop through each item in the array
      for (let i = 0; i < fileNameArr.length; i++) {
        const item = fileNameArr[i];
        // check to see if any items in the array are 4 digit numbers
        if (item.length === 4 && !isNaN(parseInt(item))) {

          if (i === fileNameArr.length - 1) {
            // if it's the last thing in the file name, just delete it
            fileNameArr.pop();
          } else {
            // replace the number with a dash
            fileNameArr.splice(i, 1, '-');
          }
        }
      }

      // join the array of words back into a string to be used in the object
      const fileNameFixed = fileNameArr.join(' ');

      // See fileMetadataEntry typedef
      fileMetadata[fullPath] = {
        'productName': productName,
        'extension': extension,
        'fileName': fileName,
        'fileSize': fs.statSync(fullPath).size,
        'Title': fileNameFixed,
      };
    }
  });

  return fileMetadata;
};

/**
 * Process the TSV file and get the relevant data
 */
const processLocalAssetsTsv = (fileMetadata, callback) => {
  console.log(`Processing ${localAssetsTsvPath}...`);
  const tsvFileFullPaths = [];
  const tsvRows = [];
  let tsvHeaders;
  let rowIndex = 1;

  /**
   * Process a row of data from TSV
   * @param {array} row Data from TSV row
   */
  const processLocalAssetsRow = (row) => {
    if (rowIndex === 1) {
      tsvHeaders = row;
    }
    else {
      // Populate tsvRows with data
      tsvRows.push(row);

      // Populate tsvFileFullPaths
      // Get the column number for the fullPath, in case they get reordered
      const fullPathHeaderIndex = tsvHeaders.indexOf('fullPath');
      if (!fullPathHeaderIndex) {
        console.error('Couldn\'t get the column id for fullPath in TSV Header', tsvHeaders);
        return;
      }
      else {
        // Get the value of the for path column
        const fullPath = row[fullPathHeaderIndex].trim();
        if (fullPath) {
          // Populate an array of fullPaths that are in the TSV so we can figure out what files aren't in the TSV later
          tsvFileFullPaths.push(fullPath);
        }
        else {
          console.warn('Couldn\'t get fullPath for row.', 'Row: ', row, 'Headers:', tsvHeaders, 'fullPathHeaderIndex: ', fullPathHeaderIndex);
        }
      }
    }
    rowIndex++;
  };

  /**
   * Compare data in TSV to files in the compiled folder and make sure each file is represented in the TSV
   */
  const getNewTsvRows = (fileMetadata, tsvHeaders) => {
    if (!fileMetadata, !Object.keys(fileMetadata).length) {
      console.error('Missing required data from fileMetadata.', fileMetadata);
    }
    if (!tsvHeaders || !tsvRows) {
      console.error('Missing required data from localAssets.tsv', 'tsvHeaders: ', tsvHeaders, 'tsvRows: ', tsvRows);
    }

    const localFullFilePaths = Object.keys(fileMetadata);
    const rowsToAddToTsv = [];

    localFullFilePaths.forEach((fullPath) => {
      // Check to see if file already exists in the TSV
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
          // Making sure column exists in TSV, indexOf will return -1 if the column doesn't exist
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

  const postLocalAssetsProcessing = () => {
    // Subtracting one for header row, and one because the count starts at 1
    console.log(`Processed ${rowIndex - 2} files from TSV.\n`);

    // Figure out what files are new
    console.log('Comparing indexed files to files in TSV...');
    const newTsvRows = getNewTsvRows(fileMetadata, tsvHeaders);

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

        if (typeof callback === 'function') {
          callback(tsvHeaders, allRows);
        }
      });
    }
    // There weren't any new rows, just create the index page
    else {
      console.log(`No new files to add to the TSV.\n`);
        if (typeof callback === 'function') {
          callback(tsvHeaders, tsvRows);
        }
    }
  };

  // Kick off TSV processing
  fs.createReadStream(localAssetsTsvPath)
    .pipe(parse({delimiter: tsvDelimeter, from_line: 1 }))
    .on('error', (error) => {
      console.warn(error);
    })
    .on('data', processLocalAssetsRow)
    .on('end', postLocalAssetsProcessing);
};

exports.crawlDir = crawlDir;
exports.processLocalAssetsTsv = processLocalAssetsTsv;
