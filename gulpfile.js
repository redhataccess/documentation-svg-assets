/* eslint-env node, es6 */
/* global require */
'use strict';

/**
 * Configuration
 */
const
  {
    // parallel,
    // series,
    src,
    dest,
    task,
    // watch,
  } = require('gulp'),
  svgo = require('gulp-svgo'),
  replace = require('gulp-replace');

const
  svgSource = 'source/**/*.svg',
  svgDestination = 'for-web';

const optimizeSvgs = () =>
  src(svgSource)
    // Replace any font declarations with CSS fallback fonts
    .pipe(replace(/font-family:.*;/g, (match) => {
      match = match.toLowerCase();
      if (match.indexOf('mono') >= 0) {
        return 'font-family: LiberationMono, "Liberation Mono", monospace;';
      }
      if (match.indexOf('redhattext') >= 0 || match.indexOf('red hat text') >= 0) {
        if (match.indexOf('bold') >= 0) {
          return 'font-family: RedHatText, "Red Hat Text", Overpass,"Helvetica Neue", Arial, sans-serif; font-weight: bold;';
        }
        if (match.indexOf('medium') >= 0) {
          return 'font-family: RedHatText, "Red Hat Text", Overpass,"Helvetica Neue", Arial, sans-serif; font-weight: 500;';
        }
        if (match.indexOf('regular') >= 0) {
          return 'font-family: RedHatText, "Red Hat Text", Overpass,"Helvetica Neue", Arial, sans-serif;';
        }
        console.warn('Couldn\'t find a matching rule for the Red Hat Text variation, if it\'s not Regular non-italic, contact cpfed@redhat.com', `CSS was ${match}`);
        return 'font-family: RedHatText, "Red Hat Text", Overpass,"Helvetica Neue", Arial, sans-serif;';
      }
      console.error('Found a font face that couldn\'t be optimized, please notify cpfed@redhat.com to add coverage for it. Found: ', `CSS was ${match}`);
    }))
    .pipe(svgo())
    .pipe(dest(svgDestination));

task('default', optimizeSvgs);