# views

`views` are controller and visual UI/UX components that show content and can host widgets. A view is created or destroyed in response to the `page url` changing. Views are never shown without the url changing and no other visual objects are created or destroyed without a view creating them, or in response to a view being destroyed.

## Files

- home.js  
  `HomeComponent` is the view for the route `home`. It displays information about the logged in user and displays the current authentication tokens. When the tokens refresh they will update. The HomeComponent requests the tiles object from the Rest API. It displays the tiles as clickable text.
- list.js 
  `ListComponent` is the view for routes that are not `home` or `login`. If an additional view/route pair is added eg: `profile`, the `routeChanged` method in `AppComponent` will need to be updated.
- login.js  
  `LoginComponent` is the view for the route `login`. It manages the `oAuth2Service` to start and maintain OAuth2 connections to DM. It also support plain text authentication as a fallback if allowed. It currently does not support the DM guest account.
- README.md  
  This file
- view.js  
  The module loader