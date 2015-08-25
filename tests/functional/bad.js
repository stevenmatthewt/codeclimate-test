/*eslint-env node */
/*eslint quotes: [1, "single"] */
'use strict';

var gulp = require('gulp');
var sass = require('gulp-sass');
var concat = require('gulp-concat');
var replace = require('gulp-replace');
var stream = require('stream');
var gutil = require('gulp-util');
var _ = require('lodash');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var program = require('commander');
a
var baseout = './out/';
var version, outputCss;

program.version('0.0.1')
    .option('-p, --staticPath [path]', 'path to static assets [/4.0]', '/4.0')
    .option('-s, --specifyVersion [version]', 'specify version of generated assets [timestamp]', '' + Date.now())
    .parse(process.argv);

function setVersion(ver) {
    version = ver;
    outputCss = baseout + ver + '/';
}
setVersion(program.specifyVersion);

var cssAssetsPath = program.staticPath;
var cssImgPath = cssAssetsPath + '/img/';
var cssFontPath = cssAssetsPath + '/fonts';
var jsImgPath = 'Luceo.jsProperties.cdn';

function getStringSrc(filename, string) {
    var src = stream.Readable({ objectMode: true });
    src._read = function () {
        this.push(new gutil.File({
            cwd: '',
            base: '',
            path: filename,
            contents: new Buffer(string)
        }));
        this.push(null);
    };
    return src;
}

function generateJavascript(destinationPath) {
    var imgPath = jsImgPath + ' + \'/img/$1\'';
    return gulp.src('./legacy/src/assets/js/**/*.@(js|php)')
        .pipe(replace(/['"]<\?php echo getImg\(['"](.+)['"]\);?\s*\?>['"]/g, imgPath))
        .pipe(replace(/['"]<\?php echo ([^;]+);?\s*\?>['"]/g, 'PsLocal.$1'))
        .pipe(sourcemaps.init())
        .pipe(concat('ps35.js'))
        .pipe(uglify())
        .pipe(sourcemaps.write('./', {sourceRoot: '/source/js/legacy'}))
        .pipe(gulp.dest(destinationPath));
}

function generateStyles(destinationPath) {
    return gulp.src([
            destinationPath + 'legacy.css',
            destinationPath + 'new.css'
        ])
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(concat('main.css'))
        // .pipe(minifyCss({keepBreaks: true}))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(destinationPath));
}

function generateNew(destinationPath) {
    return gulp.src('./assets/stylesheets/main/main.scss')
        .pipe(sourcemaps.init())
        .pipe(sass({
            includePaths: [outputCss]
        }))
        .pipe(concat('new.css'))
        .pipe(sourcemaps.write('./', {sourceRoot: '/css/new'}))
        .pipe(gulp.dest(destinationPath));
}

function generateLegacy(destinationPath) {
    return gulp.src([
            './legacy/src/assets/css/**/*.@(css|php)',
            './legacy/src/assets/css/**/**/*.@(css|php)'])
        .pipe(replace(/<\?php echo getImg\('(.+)'\);\?>/g, cssImgPath + '$1'))
        .pipe(replace('\*html', 'html')) // Hotfixes
        .pipe(replace(/([\w])\/\/([\w])/g, '$1/$2'))
        .pipe(sourcemaps.init())
        .pipe(concat('legacy.css'))
        .pipe(sourcemaps.write('./', {sourceRoot: '/css/legacy'}))
        .pipe(gulp.dest(destinationPath));
}

function generateConfig(destination) {
    var content = _.map({
        'path-img': cssImgPath,
        'fa-font-path': cssFontPath
    }, function (val, key) {
        return '$' + key + ': "' + val + '";';
    }).join('\n');

    return getStringSrc('_main_config.scss', content)
        .pipe(gulp.dest(destination));
}

function generateMooTools(destinationPath) {
    return gulp.src([
        './legacy/public/js/lib/mootools/mootools-core-1.3.2-full-compat.js',
        './legacy/public/js/lib/mootools/mootools-more-1.3.2.1.js',
        './legacy/public/js/lib/mootools/clientcide.2.2.0.js',
        './legacy/public/js/lib/mootools/datepicker.js',
        './legacy/public/js/lib/mootools/datepicker_pfs.js',
        './legacy/public/js/lib/mootools/mif.tree-v1.2.6.4.js',
        './legacy/public/js/lib/mootools/border-radius.js',
        './legacy/public/js/lib/mootools/GrowingInput.js',
        './legacy/public/js/lib/mootools/TextboxList.js',
        './legacy/public/js/lib/mootools/TextboxList.Autocomplete.js',
        './legacy/public/js/lib/mootools/TextboxList.Autocomplete.Binary.js',
        './legacy/public/js/lib/mootools/calendar-eightysix-v1.1.js',
        './legacy/public/js/lib/mootools/MooDropMenu.js',
        './legacy/public/js/lib/mootools/datepicker_ampm.js', // Hack to have datepicker work in AM/PM mode
        './legacy/public/js/lib/mootools/mootools_hack.js'
    ])

    // Compatibility with TinyMCE
    // document.id is renamed to document.moo
    .pipe(replace('id: (function(){', 'moo: (function(){'))
    .pipe(replace('document.id', 'document.moo'))
    .pipe(replace('return this.id(', 'return this.moo('))

    // Issue with z-index 999 in calendar86
    .pipe(replace('(\'.c86-container.a\').setStyle(\'z-index\', 999);', '(\'.c86-container.a\').setStyle(\'z-index\', 59);'))
    .pipe(replace('(\'.c86-container.b\').setStyle(\'z-index\', 998);', '(\'.c86-container.b\').setStyle(\'z-index\', 58);'))
    .pipe(replace('(\'c86-year-decade\').setStyles({ \'opacity\': 1, \'display\': \'block\', \'z-index\': 999 });', '(\'c86-year-decade\').setStyles({ \'opacity\': 1, \'display\': \'block\', \'z-index\': 59 });'))
    .pipe(replace('this.tempContainer.setStyle(\'z-index\', 998);', 'this.tempContainer.setStyle(\'z-index\', 58);'))
    .pipe(replace('<div class="c86-arrow-left"></div><div class="c86-arrow-right"></div>', '<div class="c86-arrow-left">◄</div><div class="c86-arrow-right">►</div>'))

    // Mif.Tree: Compatibility issue with mootools 1.3
    .pipe(replace('Implements: [new Events, new Options],', 'Implements: [Events, Options],'))

    // Growing input: positioning issue (-1000 is not enough)
    .pipe(replace(
        'this.calc = new Element(\'span\', {\n' +
        '           \'styles\': {\n' +
        '               \'float\': \'left\',\n' +
        '               \'display\': \'inline-block\',\n' +
        '               \'position\': \'absolute\',\n' +
        '               \'left\': -1000\n' +
        '           }\n' +
        '       }).inject(this.element, \'after\');',
        'this.calc = new Element(\'span\', {\n' +
        '           \'styles\': {\n' +
        '               \'float\': \'left\',\n' +
        '               \'display\': \'inline-block\',\n' +
        '               \'position\': \'absolute\',\n' +
        '               \'left\': -10000\n' +
        '           }\n' +
        '       }).inject(this.element, \'after\');'
    ))

    // Manage case when un-visible element disallow to click on the element under it
    .pipe(replace(
        "if (opacity == 0 && visibility != 'hidden') this.style.visibility = 'hidden';",
        "if (opacity == 0 && visibility != 'hidden') {" +
        "    if ($(this).get('class') == 'content_ifb tip_pj') {" +
        "        this.style.display = 'none';" +
        "    }" +
        "    this.style.visibility = 'hidden';" +
        "}"
    ))
    .pipe(replace(
        "else if (opacity != 0 && visibility != 'visible') this.style.visibility = 'visible';",
        "else if (opacity != 0 && visibility != 'visible') {" +
        "    if ($(this).get('class') == 'content_ifb tip_pj') {" +
        "        this.style.display = 'block';" +
        "    }" +
        "    this.style.visibility = 'visible';" +
        "}"
    ))

    .pipe(sourcemaps.init())
    .pipe(concat('moo.js'))
    .pipe(uglify())
    .pipe(sourcemaps.write('./', {sourceRoot: '/source/js/mootools'}))
    .pipe(gulp.dest(destinationPath));
}

gulp.task('generate:styles', ['version', 'generate:legacy', 'generate:new'], function () {
    console.log('cssAssetsPath is ' + cssAssetsPath);
    return generateStyles(outputCss);
});

gulp.task('generate:legacy', ['version'], function () {
    return generateLegacy(outputCss);
});

gulp.task('generate:new', ['version', 'generate:config'], function () {
    return generateNew(outputCss);
});

gulp.task('generate:config', ['version'], function () {
    return generateConfig(outputCss);
});

gulp.task('generate:scripts', ['version'], function () {
    return generateJavascript(outputCss);
});

gulp.task('generate:mootools', ['version'], function () {
    return generateMooTools(outputCss);
});

gulp.task('version', function () {
    console.info('version is ' + version);
    return getStringSrc('version', version)
        .pipe(gulp.dest(baseout));
});

gulp.task('newversion', function () {
    setVersion('' + Date.now());
});

gulp.task('watch', ['default'], function () {
    return gulp.watch([
        './legacy/src/assets/css/**/*.@(css|php)',
        './assets/stylesheets/**/*.scss',
        './legacy/src/assets/js/**/*.@(js|php)',
        './legacy/public/js/lib/mootools/*.js'
    ], ['newversion', 'default']);
});

gulp.task('default', ['generate:styles', 'generate:scripts', 'generate:mootools'], function () {});
