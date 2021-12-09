# services

`services` are helper classes that can be `shared` or `uniquely` instantiated to `serve data` to components.

## Files

- oauth.js  
  This service provides `external authentication` services to the RAPI-IC client. It has two main methods, `login` and `logout` which do as titled against an `authentication server`. `Clients` are serived with code in this file as well as support html for OAuth2 redirects and javascript helper files in the `assets` folder. `Add-ins` need to put up Microsoft specific dialogs for user input when the user needs to supply credentials in `authentication server provided forms`
- service.js  
  The module loader and services provider
- README.md  
  This file