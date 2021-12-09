# ic-restapi-js

Pure Javascript Framework to use as a basis for custom Web and Office Add-in applications that connect to the DM Server through the InfoCenter Rest API.

## Installation

If you want to take advantage of the development server you will need to run `npm install` Otherwise there is no installation.

## Build

There is no build as the project is all javascript and ready to be served


## Development server

Run `npm start` for a [dev server](https://www.npmjs.com/package/lite-server). Navigate to `http://localhost:8080/`. The app will automatically reload if you change any of the source files. Note that this server is non ssl plain http that will work for browsers, but cannot be used to server add-ins.

## Production server

To be able to deploy the project as an Office/Outlook add-in the project will need to be served by a web server with valid ssl certificates over https. Follow the same procedure as installing InfoCenter add-ins. Start with the office-xxx.xml manifest for Office add-ins and/or the outlook-xxx.xml manifest for Outlook.

## Modules

At the root of each folder in the project a readme will explain concepts and files in the module.


# Contents

## Folders

1. src  
  Contains the project source code files, resources and modules

## Files

- bs-config.json  
  Config file with settings for the development server
- package-lock.json  
  Auto generated file that must be checed in when `package.json` changes
- package.json  
  Application and build config file for including dependent `node` libraries
- README.md  
  This file