var fse = require("fs-extra");
var path = require("path");
var archiver = require('archiver');
var extract = require('extract-zip');

function createZip(includes, sourcePath, zipFile, onComplete) {
    var archive = archiver('zip', {zlib:{level:9}});
    
    var output = fse.createWriteStream(zipFile);
    
    output.on('finish', onComplete);
    
    archive.pipe(output);

    includes.forEach(function(include) {
        addFile(archive, include, sourcePath);
    });
    
    archive.finalize();
}

function addFile(archive, include, sourcePath) {
    var sPath = path.join(sourcePath, include.name);
    var destName = include.finalName?include.finalName:include.name;
    var isDir = fse.lstatSync(sPath).isDirectory();
    var options = include.mode ? {"mode":include.mode} : {};
    if (isDir) {
        archive.directory(sPath, destName, options);
    } else {
		options.name = destName
        archive.file(sPath, options);
    }
}

function unZip (source, target, cb) {
    extract(source, { dir: target }).then(function() {
        cb();
    }).catch(function(err) {
        cb(err);
    });
}

module.exports = {
    createZip: createZip,
    unZip: unZip
};
