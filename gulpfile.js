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
      svgo = require('gulp-svgo');

const
  svgSource = 'source/**/*.svg',
  svgDestination = 'for-web';

const optimizeSvgs = () =>
  src(svgSource)
    .pipe(svgo())
    .pipe(dest(svgDestination));

task('default', optimizeSvgs);