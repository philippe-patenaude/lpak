LPAK
====

This project is used to create Love 2D release packages.

Build Project
=============

Run `node build.js` to build the project.

Setup Application
=================

The full application will be `lpak.zip` at the root of the directory.

Extract `lpak.zip` and place it somewhere permanent.

Add the `bin` directory from the above extracted zip into the `path` environment variable.

Run Application
===============

The command line is `lpak [<os>]`.

Go to your project directory and run `lpak` from the command line.

This will build the project into `release\<os>\<project name>.zip`

Configure a Game
================

To configure a game to use lpak, use the below `lpak.json` example.

```json
{
    "name": "lpak-example",
    "id": "com.wintergreen.lpak-example",
    "love-version": "11.3",
    "files": [
        {"name":"main.lua"},
        {"name":"src"},
        {"name":"info.txt"}
    ],
    "includes": [
        {"name":"info.txt"}
    ]
}
```

`name` is used to set the package name.
`id` is an ID used for Mac builds.
`love-version` is the version of love that the game will be packaged with.
`files` is the list of source code and resource files to be packaged. This can include directories.
`includes` is a list of resources that need to be reachable by users, such as a README or a license.
