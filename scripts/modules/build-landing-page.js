const fs = require('fs');

// Config
const indexPagePath = './for-web/index.html';
const pageTitle = 'Documentation Diagram Library';

/**
 * Creates the HTML for a table based on arrays
 * @param {array} headerRow Column headings as an array
 * @param {array} rows An array of arrays with the latter being the values for each cell in a row
 * @returns {string} the HTML for the table
 */
const buildListingTable = (headerRow, rows) => {
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
    const table = buildListingTable(headerRow, rows);
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

exports.buildIndexHtml = buildIndexHtml;
exports.buildListingTable = buildListingTable;