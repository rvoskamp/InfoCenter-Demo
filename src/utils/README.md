# utils

`Utilities` are static class singletons that are instantiated at app load time. They are available to all javascript code prefixed with Util.xxx.xxx

## Files

- device.js  
  `Util.Device` holds all of the details needed for the RAPI-IC client to decide at runtime what type of `layout` and code to use in response to `screen size` or specific `device type`.
- restful.js  
  `Util.RestAPI` handles all communication between the `Rest API` and the `RAPI-IC client`. All requests to the Rest API bottleneck through the method `doVerb` which returns an `Promise` object. Callers will typically use wrapper methods such as `get` or `put`. This singleton also manages Rest API refresh tokens when the `oAuth2Service` authentication token is refreshed
- router.js  
  `Util.Router` handles user initiated navigation in the app. Route changes will be broadcast to listener objects on location change.
- util.js  
  Import and export defintions for this `module`. This is where the static class `Util` is defined and where Util declares all of other the Utility static classes it hosts. There are other static methods that are here for convience as they are used by multiple objects and modules.