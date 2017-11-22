var gulp = require('gulp');
var del = require('del');
var uglify = require('gulp-uglify');
var jsonminify = require('gulp-jsonminify');
var sourcemaps = require('gulp-sourcemaps');
var babel = require('gulp-babel');
var nodemon = require('gulp-nodemon');
var concat = require('gulp-concat');
var gutil = require('gulp-util');
var stripDebug = require('gulp-strip-debug');
var fs = require('fs');

// user gulp to delete original build file
gulp.task('clean', function(){
  return del(['./build/**'])
})

// create a new build file (copy from ./server)
gulp.task('build',function(callback) {
   gulp.src(['./server/**'])
    .pipe(gulp.dest('./build'));
});

// transpile es6 js codes
gulp.task('transpile', function() {
  gulp.src('./server/**')
  .pipe(babel({
    ignore: [
      './*.json'
    ],
    presets: ['es2015']                 
  }))
  .pipe(gulp.dest('./build'));
});

// strip console, alert and debugger
gulp.task('stripdebug', function() {
  gulp.src(['./build/**/*.js'])
    .pipe(stripDebug())
    .pipe(gulp.dest('./build'));
});

// compress js and json files
gulp.task('compress', function() {
  gulp.src(['./build/**/*.js'])
    .pipe(uglify())
    .pipe(gulp.dest('./build'));
  gulp.src(['./build/**/*.json'])
    .pipe(jsonminify())
    .pipe(gulp.dest('./build'));
});

// start gulp clean and transpile tasks
// gulp.task('rebuild', ['clean','transpile']);

// start nodemon, transpile and compress tasks
gulp.task('restart', function () {
  nodemon({
    watch : './server',
    tasks : ['transpile','compress'],
    script : '.'
  });
});
