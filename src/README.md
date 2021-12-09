# src

`src` is the root of the source code for the project

## Folders

1. assets  
  All `application resources` are in this folder
2. services  
  Classes that provide a common `service` to other classes in the application
3. utils  
  Singleton objects available in the global name space as `Util.x`
4. views  
  High level `UI/UX objects` that hold other `components`. Views are the root of a route. eg: the `login view` is what is rendered when the user navigates to login
5. widgets  
  Components that can be `installed` into other components. A view can contain a widget however a widget cannot contain a view

## Files

- index.html  
  `First page` loaded by the webserver
- main.css  
  `CSS` file with global definitions for site styling
- main.js  
  `AppComponent` is the only component loaded by index.html. It holds a single `container element` that the current route's view gets loaded into. It listens for `route changes` and loads the correct view for the route. If you add a new route and a view to support it you will need to modify the `routeChanged` method to load the new view. There are some startup functions in this file to check if the app is being served in an Office/Outlook add-in and wait for Office/Outlook to initialize before starting up the AppComponent.
- README.md  
  This file