var fs = require('fs');
var del = require('del');
var gulp = require('gulp');

// Common pathes
var path = {
    dest: './build'
};

// Clean output
gulp.task('clean', function () {
    return del([
        path.dest + '/**/*',
    ]);
});

gulp.task('default', ['static']);
