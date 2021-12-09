# assets

`assets` is the root folder for all of the persistent data needed by the application. This includes things such as images, config files, javascript libraries and helper html pages

## Folders

1. images  
  `SVG` and `png` icons and backgrounds
2. js  
  External javascript files/libraries loaded by index.html

## Files

- config.json  
  Client `web server config file`. This file is a place holder for defaults that a site may change. The InfoCenter congfig.json file may be used here
- xxx-manifest.xml    
  A series of Microsoft specific add-in `manifest` files for installing IC as a web site into hosting apps
- signin-xxx.html, signout-xxx.html, silent-xxx.html  
  A series of web pages used in `Oauth2 authentication`
