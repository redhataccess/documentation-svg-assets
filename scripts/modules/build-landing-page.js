const fs = require('fs');

// Config
const indexPagePath = './for-web/';
const pageTitle = 'Documentation Diagram Library';

/**
 * Creates the HTML for a table based on arrays
 * @param {array} headerRow Column headings as an array
 * @param {array} rows An array of arrays with the latter being the values for each cell in a row
 * @returns {string} the HTML for the table
 */
const buildListingTable = (headerRow, rows, title) => {
  // console.log({rows});
  // console.log({headerRow});
  // Create a new array variable because the array.splice below was messing up the array in other parts of the process
  let headerRowArr = [...headerRow];
  let headerRowArrOriginal = [...headerRow];


  if (!Array.isArray(headerRowArr) || !headerRowArr.length) {
    console.error(`Tried to build HTML table for ${title} page without a headerRow`, 'headerRow: ', headerRowArr, 'rows: ', 'rows');
    return;
  }
  // if (!Array.isArray(rows) || !rows.length) {
  //   console.error(`Tried to build HTML table for ${title} page without rows`, 'headerRow: ', headerRowArr, 'rows: ', rows);
  //   return;
  // }

  // Remove full path column
  const fullPathIndex = headerRowArr.indexOf('fullPath');
  headerRowArr.splice(fullPathIndex, 1);
  headerRowArrOriginal.splice(fullPathIndex, 1);

  // Remove file name column
  const fileNameIndex = headerRowArr.indexOf('fileName');
  headerRowArr.splice(fileNameIndex, 1);
  headerRowArrOriginal.splice(fileNameIndex, 1);


  // Add new preview column
  headerRowArr = ['Preview'].concat(headerRowArr);

  // Get column number of sortable columns
  const fileSizeIndex = headerRowArr.indexOf('fileSize');
  const titleIndex = headerRowArr.indexOf('Title');
  const relatedProductsIndex = headerRowArr.indexOf('relatedProducts');
  const extensionIndex = headerRowArr.indexOf('extension');
  const createdDateIndex = headerRowArr.indexOf('createdDate');

  // Adding 1 to each because a preview column was added as the first column
  const sortableColumns = [
    titleIndex + 1,
    relatedProductsIndex + 1,
    extensionIndex + 1,
    createdDateIndex + 1,
    fileSizeIndex + 1,
  ];

  // Setup web component wrapper and start table and table head
  let table = `<rh-table full-screen="false" sortable="${sortableColumns.join(',')}"><table><thead><tr>\n`;

  // Create table headers
  headerRowArr.forEach((heading) => {
    // Convert machine friendly names to human friendly names
    switch (heading) {
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

for (const row in rows) {
  if (Object.hasOwnProperty.call(rows, row)) {
    const currentRow = rows[row];
    // Start table row
    table = `${table}<tr>`;
    // Make first column the preview image
    let rowCleaned = row
    // Remove for-web from path since HTML file is in that folder
    const startsWithForWeb = row.indexOf('for-web/') === 0;
    if (startsWithForWeb) rowCleaned = row.substring(8);
    // create the preview image
    table = `${table}<td class="column---Preview"><img tabindex="0" data-src="${rowCleaned}" alt="" class="preview-image js-lazy-load" /></td>\n`;

    // loop through the headings and add the data for each into the table
    headerRowArrOriginal.forEach((heading) => {
      // Start array for classes on td with column header class name
      const cellClasses = [`column--${heading}`];
      let content = currentRow[heading]
       // Add warning or error class for files with large sizees
       if (heading === 'fileSize') {
         // Convert bytes into kilobytes
         content = Math.round(parseInt(content) / 1024);
         // Mark 500kb as an 'error'
         if (content > 300) {
           cellClasses.push('error');
         }
         // Warn for 150kb and up
         else if (content > 150) {
           cellClasses.push('warning');
         }
       }
       // If there's nothing there, instead of passing "undefined" pass an empty string
       if (!content) {
        content = '';
       }

    
       // Build attributes as string
       const attributes = ` class="${cellClasses.join(' ')}"`;
       // Write out table cell with attributes and data
       table = `${table}<td${attributes}>${content}</td>\n`;
    
    
    
    });

    // Complete the row
    table = `${table}</tr>`;
  }
}

  // Complete table tags
  table = `${table}</table></rh-table>`;
  return table;
}

/**
 * Builds the pages for listing all of the diagrams
 * @param {array} headerRow Column headings as an array
 * @param {array} rows An array of arrays with the latter being the values for each cell in a row
 */
const buildImagePages = (headerRow, rows, title, productsLinks) => {
  console.log(`Starting ${title} page build...`);
  let pageLinks = [...productsLinks]
  const titleCleaned = title.replace(/ /g,"_");
  const pageAddress = indexPagePath + titleCleaned + '.html';
  const indexPage = fs.createWriteStream(pageAddress);
  for (let i = 0; i < pageLinks.length; i++) {
    let link = pageLinks[i];
    if (link.includes(`${titleCleaned}.html`)) {
      let updatedLink = link.replace("product-link", "product-link product-link--active");
      pageLinks.splice(i, 1, updatedLink);
    }
  }
  console.log(pageLinks);

  indexPage.once('open', () => {
    const table = buildListingTable(headerRow, rows, title);
    if (table) {
      let indexHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${pageTitle} - Red Hat</title>
          <link media="all" rel="stylesheet" type="text/css" href="_listing-page-assets/@patternfly/pfe-styles/dist/pfe-base.min.css" />
          <link media="all" rel="stylesheet" type="text/css" href="_listing-page-assets/@patternfly/pfe-styles/dist/red-hat-font.min.css" />
          <link media="all" rel="stylesheet" type="text/css" href="_listing-page-assets/@cpelements/rh-table/dist/rh-table--lightdom.css" />
          <link media="all" rel="stylesheet" type="text/css" href="_listing-page-assets/styles.css" />
          <script src="_listing-page-assets/@cpelements/rh-table/dist/rh-table.min.js" type="module"></script>
          <script src="_listing-page-assets/script.js"></script>
        </head>
        <body>
        <div class='content-container'>
          <h1>${pageTitle}</h1>
          <a href='/' class='back-link'>Back to product listing</a>
          <button class="content-expander__trigger">
            View other products
        </button>
        <div class=" content-expander">
          <div class='product-grid'>
            ${pageLinks.join('')}
          </div>
        </div>
          
          ${table}

          </div>
        </body>
      </html>`;
      indexPage.end(indexHtml);
    }

    console.log(`Successfully built ${title} page.`);
  });
};

/**
 * Builds an index html page listing all of the products being referenced
 * @param {array} products array of the products links will be made of
 */
const buildIndexHtml = (productsLinks) => {  
  console.log(`Starting index page build...`);
  // write file
  const indexPage = fs.createWriteStream(indexPagePath + 'index.html');
  indexPage.once('open', () => {
    // create page structure and insert the products content
    const pageContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Documentation Diagram Library - Red Hat</title>
        <link media="all" rel="stylesheet" type="text/css" href="_listing-page-assets/@patternfly/pfe-styles/dist/pfe-base.min.css" />
        <link media="all" rel="stylesheet" type="text/css" href="_listing-page-assets/@patternfly/pfe-styles/dist/red-hat-font.min.css" />
        <link media="all" rel="stylesheet" type="text/css" href="_listing-page-assets/styles.css" />
        <script src="_listing-page-assets/script.js"></script>
      </head>
      <body>
        <div class='content-container'>
          <h1>Documentation Diagram Library</h1>
          <p class='product-list-description'>
          Click a link to view the diagrams associated with that product.
          </p>
          <div class='product-grid'>
          ${productsLinks.join('')}
          </div>
        </div>
      </body>
    </html>
    `;

 indexPage.end(pageContent);
 console.log('Successfully built index page.');
});
}


const buildPages = (headerRow, fileRows) => {
  // create object for file data
  const fileMetadata = {}
  // loop through the files
  fileRows.forEach(file => {
    // create object to store file data
    const fileObj = {}
    let productName
    // loop through array of file info and add to object
    for (let i = 0; i < headerRow.length; i++) {
      const heading = headerRow[i];
      const content = file[i];
      fileObj[heading] = content
      if (heading === 'fullPath') {
        // Get the 2nd path and assume it's a product name (e.g. for-web/RHEL, use RHEL)
        productName = content.split('/')[1];
      }
    }
    // check to see if product is in fileMetadata object and add if it isn't
    if (productName && !fileMetadata[productName]) {
      fileMetadata[productName] = {}
    }
    // add object to fileMetadata object under key for product
    fileMetadata[productName][fileObj.fullPath] = {...fileObj}
  })

  // create index page from products
  const products = Object.keys(fileMetadata);

  let productsLinks = []
  // loop through products and create links for them
  products.forEach((product) =>{
    const titleCleaned = product.replace(/ /g,"_");
    productsLinks.push(`<a href='${titleCleaned}.html' class='product-link'>${product}</a>`);
  })

  buildIndexHtml(productsLinks);
  // Loop through keys in the object to pass the objects inside for building the web pages
  for (const title in fileMetadata) {
    if (Object.hasOwnProperty.call(fileMetadata, title)) {
      // const rows = Object.values(fileMetadata[title]);
      const rows = fileMetadata[title];
      // console.log({rows});
      buildImagePages(headerRow, rows, title, productsLinks);
    }
  }
}

exports.buildImagePages = buildImagePages;
exports.buildIndexHtml = buildIndexHtml;
exports.buildListingTable = buildListingTable;
exports.buildPages = buildPages;