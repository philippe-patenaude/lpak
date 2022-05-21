var fse = require("fs-extra");
var path = require("path");
var zipUtility = require("./zip-utility");
var download = require("./fileDownload");

var homeDir = require('os').homedir();
var lpakUserDirectory = path.join(homeDir, ".lpak");

var commandMap = {
    '-h': printHelp,
    '--help': printHelp,
    '?': printHelp,
    '-?': printHelp,
    '--init': initializeProject,
    '-i': initializeProject
}

var packagingMethods = {
    "Windows": onZipCompleteWindows,
    "MacOSX": onZipCompleteMacOSX
};

process.on('uncaughtException', function (err) {
    console.error(err);
    if (lpak)
        printHelp();
    process.exit(1);
});

var projectDirectory = process.cwd();

// Check commands
var firstCommand = process.argv[2];
var commandFunc = commandMap[firstCommand];
if (commandFunc) {
    commandFunc();
    return;
}

// Get the lpak file.
var lpakPath = path.join(projectDirectory, "lpak.json")
if (!fse.pathExistsSync(lpakPath)) {
    throw new Error("The project directory \"" + projectDirectory + "\" doesn't contain an lpak.json file.");
}
var lpak = require(lpakPath)
var applicationName = lpak.name;

var buildConfigDir = path.join(lpakUserDirectory, "buildConfigs.json");
var buildConfigs = null;
var tempLoveDir = null;
var tempLoveZip = null;
var tempLoveExtract = null;
var tempLoveDirRoot = null;
var applicationDotLovePath = null;
var files = null;
var releaseDir = null;
var bundleDir = null;
var build = null;
var loveConfig = null;

console.log("Downloading build configurations.");

fse.ensureDirSync(lpakUserDirectory);

download("https://raw.githubusercontent.com/philippe-patenaude/lpak/master/buildConfigs.json", buildConfigDir, function(err) {

    if (err) throw err;

    buildConfigs = require(buildConfigDir);

    var buildConfigByVersion = buildConfigs[lpak["love-version"]];
    if (!buildConfigByVersion) {
        var supportedVersions = getVersionList();
        throw new Error("The love version " + lpak["love-version"] + " is not supported. Supported values are " + JSON.stringify(supportedVersions) + ".");
    }

    buildConfigs = buildConfigByVersion.build;
    
    buildConfigs.osx.includes[0].finalName = applicationName+".app";

    prepareBuild();

});

function prepareBuild() {
    
    // Grab the first argument or default to Windows 32 bit.
    build = firstCommand || "win32";
    build = build.toLowerCase();
    
    loveConfig = buildConfigs[build];
    
    if (!loveConfig) {
        throw new Error("An invalid build ID was passed in: " + build + ". Valid values are win32, win64, and osx.");
    }
    
    files = lpak.files;
    
    releaseDir = path.join("release", build);
    bundleDir = path.join(releaseDir, "bundle");
    fse.emptyDirSync(releaseDir);
    fse.ensureDirSync(bundleDir);
    
    tempLoveDir = path.join(lpakUserDirectory, lpak["love-version"], build);
    tempLoveZip = path.join(tempLoveDir, "love.zip");
    tempLoveExtract = path.join(tempLoveDir, "love");
    tempLoveDirRoot = path.join(tempLoveExtract, loveConfig["extracted-root"]);
    applicationDotLovePath = path.join(releaseDir, applicationName + ".love");
    if (!fse.existsSync(tempLoveZip)) {
        fse.ensureDirSync(tempLoveDir);
        console.log("Downloading Love2D zip for " + build);
        download(buildConfigs[build].path, tempLoveZip, function(downErr) {
            if (downErr) {
                fse.emptyDirSync(tempLoveDir);
                throw downErr;
            }
            zipUtility.unZip(tempLoveZip, tempLoveExtract, function(err) {
                if (err) {
                    fse.emptyDirSync(tempLoveDir);
                    throw err;
                }
                startPackaging()
            });
        });
    } else {
        console.log("Love2D zip already downloaded for " + build + ", so moving straight to packaging.");
        startPackaging()
    }
}

function getVersionList() {
    var builds = [];
    if (buildConfigs) {
        Object.keys(buildConfigs).forEach(function(key) {
            builds.push(key);
        });
    }
    return builds;
}

function startPackaging() {

    console.log("Zipping game assets.");
    var packagingMethodCallback = packagingMethods[loveConfig.packaging_method];
    zipUtility.createZip(files, projectDirectory, applicationDotLovePath, packagingMethodCallback);
    
}

function printHelp() {
    console.log("Usage: lpak [<os>]");
    console.log("\tos: One of win32, win64, or osx. This describes what operating system to build the artifact for. It defaults to win32.");
}

function initializeProject() {
    var lpakPath = path.join(projectDirectory, "lpak.json");
    if (fse.existsSync(lpakPath)) {
        throw new Error("The lpak.json file already exists. If you want a new copy, then delete the file and run the --init command again.");
    }
    var initialFile = {
        "name": "example-name",
        "id": "com.example.example-name",
        "love-version": "11.3",
        "files": [
            {"name":"main.lua"},
            {"name":"src"}
        ],
        "includes": [
            {"name":"README.md"}
        ]
    };
    fse.outputJsonSync(lpakPath, initialFile, {spaces:4});
}

function onZipCompleteWindows() {

    console.log("Creating game package for Windows.");

    var version = createVersionFile(loveConfig.version_path);

    var exePath = path.join(tempLoveDirRoot, "love.exe");
    var applicationExePath = path.join(bundleDir, applicationName + ".exe");

    // Concat love.exe with <applicationName>.love.
    fse.copyFileSync(exePath, applicationExePath);
    var applicationDotLoveContent = fse.readFileSync(applicationDotLovePath);
    fse.writeFileSync(applicationExePath, applicationDotLoveContent, {flag:"a"});

    var includeList = stageFilesAndGetIncludeList(loveConfig.includes);
    includeList.push({"name":"version.txt"});
    lpak.includes.forEach(function(inc) {
        includeList.push({"name":inc.name});
    });
    includeList.push({"name":applicationName+".exe"});
    zipUtility.createZip(includeList, bundleDir, path.join(releaseDir, applicationName + ".zip"), function() {
        console.log("Windows zip complete.");
    });

}

function onZipCompleteMacOSX() {

    console.log("Creating game package for Mac OS X.");

    var includeList = stageFilesAndGetIncludeList(loveConfig.includes);
    // Delete the love executable so that it doesn't get included in the directory zip.
    fse.removeSync(path.join(bundleDir, "love.app/Contents/MacOS/love"));
    // Copy the custom Info.plist file into the folder structure.
    var data = fse.readFileSync(path.join(__dirname,"Info.plist"), 'utf8')
    data = data.replace("__id__", lpak.id);
    data = data.replace("__bundle_name__", lpak.name);
    fse.outputFileSync(path.join(bundleDir, "love.app/Contents/Info.plist"), data)
    
    // Recreates the love executable so that it can be included in the
    // final zip file with the correct permissions.
    fse.copySync(path.join(tempLoveDirRoot, "love.app/Contents/MacOS/love"), path.join(bundleDir, "love"));
    includeList.push({
        "name":"love",
        "finalName":applicationName + ".app/Contents/MacOS/love",
        "mode":0755
    });

    var version = createVersionFile(loveConfig.version_path);
    // Copy the game content into the folder structure.
    fse.copyFileSync(applicationDotLovePath, path.join(bundleDir, "love.app/Contents/Resources", applicationName + ".love"));
    zipUtility.createZip(includeList, bundleDir, path.join(releaseDir, applicationName + ".zip"), function() {
        console.log("Mac OS X zip complete.");
    });

}

function stageFilesAndGetIncludeList(includes) {
    var includeList = [];
    includes.forEach(function(file) {
        var filePath = path.join(tempLoveDirRoot, file.name);
        fse.copySync(filePath, path.join(bundleDir, file.name));
        // Copy all the object properties over to a new object.
        var includeObject = Object.assign({}, file);
        includeObject.finalName = includeObject.finalName?includeObject.finalName:includeObject.name;
        includeList.push(includeObject);
    });
    return includeList;
}

function createVersionFile(versionPath) {
    var version = getVersion(new Date(), loveConfig.name);
    console.log("Updating version to " + version.version);
    fse.writeFileSync(path.join(bundleDir, versionPath, "version.txt"), version.version);
    // Included files.
    lpak.includes.forEach(function(inc) {
        var srcPath = path.join(projectDirectory, inc.name);
        var dstPath = path.join(bundleDir, versionPath, inc.name);
        fse.copySync(srcPath, dstPath);
    });
    return version;
}

function getVersion(date, buildConfig) {
    // Example result: Win32_2019-01-06
    var dateStr = getDateString(date);
    var version = buildConfig + "_" + dateStr;
    var versionObj = {
        version: version,
        os: buildConfig,
        date: dateStr
    };
    return versionObj;
}

function getDateString(date) {
    var yearStr = date.getFullYear().toString().padStart(4, '0');
    var monthStr = (date.getMonth()+1).toString().padStart(2, '0');
    var dateStr = date.getDate().toString().padStart(2, '0');
    return yearStr + "-" + monthStr + "-" + dateStr
}
