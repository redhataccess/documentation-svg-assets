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
    .pipe(replace(/font-family:.*?;/g, (match) => {
      match = match.toLowerCase();
      // Matching something like: "font-family: LiberationMono, Liberation Mono;"
      if (match.indexOf('mono') >= 0) {
        // Matching something like: "font-family: LiberationMono-Italic, Liberation Mono;"
        if (match.indexOf('italic') >= 0) {
          return 'font-family: LiberationMono, "Liberation Mono", Consolas, Monaco, "Andale Mono", monospace; font-style: italic;';
        }
        return 'font-family: LiberationMono, "Liberation Mono", Consolas, Monaco, "Andale Mono", monospace;';
      }
      if (match.indexOf('redhattext') >= 0 || match.indexOf('red hat text') >= 0) {
        // Matching something like "font-family: RedHatText-Bold, Red Hat Text;"
        if (match.indexOf('bold') >= 0) {
          if (match.indexOf('italic') >= 0) {
            return 'font-family: RedHatText, "Red Hat Text", Overpass,"Helvetica Neue", Arial, sans-serif; font-weight: bold; font-style: italic;';
          }
          return 'font-family: RedHatText, "Red Hat Text", Overpass,"Helvetica Neue", Arial, sans-serif; font-weight: bold;';
        }
        // Matching something like: "font-family: RedHatText-Medium, Red Hat Text;"
        if (match.indexOf('medium') >= 0) {
          if (match.indexOf('italic') >= 0) {
            return 'font-family: RedHatText, "Red Hat Text", Overpass,"Helvetica Neue", Arial, sans-serif; font-weight: 500; font-style: italic;';
          }
          return 'font-family: RedHatText, "Red Hat Text", Overpass,"Helvetica Neue", Arial, sans-serif; font-weight: 500;';
        }
        // Matching something like "font-family: RedHatText-Italic, Red Hat Text;"
        if (match.indexOf('italic') >= 0) {
          return 'font-family: RedHatText, "Red Hat Text", Overpass,"Helvetica Neue", Arial, sans-serif; font-style: italic;';
        }
        // Matching something like "font-family: RedHatText-Regular, Red Hat Text;"
        if (match.indexOf('regular') >= 0) {
          return 'font-family: RedHatText, "Red Hat Text", Overpass,"Helvetica Neue", Arial, sans-serif;';
        }
        console.warn('Couldn\'t find a matching rule for the Red Hat Text variation, if it\'s not Regular non-italic, contact cpfed@redhat.com', `CSS from Illustrator was ${match}`);
        return 'font-family: RedHatText, "Red Hat Text", Overpass,"Helvetica Neue", Arial, sans-serif;';
      }
      console.error('Found a font face that couldn\'t be optimized, please notify cpfed@redhat.com to add coverage for it. Found: ', `CSS from Illustrator was ${match}`);
    }))
    .pipe(svgo())
    .pipe(dest(svgDestination));

task('default', optimizeSvgs);
