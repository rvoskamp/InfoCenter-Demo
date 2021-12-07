export class Router {
  constructor() {
    this.curHash;
    this.listeners = [];
    addEventListener('hashchange', (e) => {
      if (location.hash !== this.curHash) {
        this.curHash = location.hash;
        this.broadcastRoute();
      }
    });
  }

  init() {
    setTimeout(() => {
      this.navLogin();
    }, 1000);
  }

  broadcastRoute() {
    for (const listener of this.listeners) {
      const boundChannged = listener.routeChanged.bind(listener);
      boundChannged(this.curHash.substring(1));
    }
  }

  addListener(listener) {
    if (this.listeners.indexOf(listener) === -1) {
      this.listeners.push(listener);
    }
  }

  removeListener(listener) {
    const idx = this.listeners.indexOf(listener);
    if (idx !== -1) {
      this.listeners.splice(idx, 1);
    }
  }

  reload() {
    location.reload();
  }

  nav(loc) {
    if (!loc.startsWith('#/')) {
      loc = '#/' + loc;
    }
    history.pushState({ loc }, '', loc);
    this.curHash = loc;
    this.broadcastRoute();
  }

  navLogin() {
    this.nav('login');
  }

  navHome() {
    this.nav('home');
  }
}
