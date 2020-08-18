var fse = require("fs-extra");
var path = require("path");
var zipUtil = require("./zip-utility");

var buildDir = "dist";

var files = [
    "credentials.example.json",
    "bin",
    "git-tag.bat",
    "google-auth.js",
    "google-drive-api.js",
    "index.js",
    "Info.plist",
    "package.json",
    "zip-utility.js",
    "node_modules"
];

fse.emptyDirSync(buildDir);

var nodeJsPath = path.join(buildDir, "nodejs");
fse.ensureDirSync(nodeJsPath);
fse.copySync("C:\\Program Files\\nodejs", nodeJsPath);
files.forEach(function(f) {
    try {
        fse.copySync(f, path.join(buildDir, f));
    } catch (e) {
        console.error("Failed to copy directory " + f + " to build directory " + buildDir + ".");
        throw e;
    }
});

zipUtil.createZip([{"name":"dist","finalName":"lpak"}], ".", "lpak.zip", function() {
    console.log("Zip file complete.");
});
