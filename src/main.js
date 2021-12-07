import { Util } from './utils/util.js';
import { Service } from '../services/service.js';
import { WidgetsModule } from '../widgets/widget.js';
import { ViewsModule } from '../views/view.js';

const template = document.createElement('template');
template.innerHTML = `
  <div id="container">
  </div>
`;
class AppComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    Util.Router.addListener(this);
  }

  disconnectedCallback() {
    Util.Router.removeListener(this);
  }

  routeChanged(loc) {
    const containerEl = this.shadowRoot.getElementById('container');
    if (loc === '/login') {
      containerEl.innerHTML = `<ic-login></ic-login>`;
    } else if (loc === '/home') {
      containerEl.innerHTML = `<ic-home></ic-home>`;
    } else {
      if (Util.isContainer(loc.substring(1).split('?')[0])) {
        const desc = Util.getQueryFromURL(loc, 'desc');
        containerEl.innerHTML = `<ic-list desc="${desc}"></ic-list>`;
      } else {
        containerEl.innerHTML = ``;
      }
    }
  }
}

const launch = () => {
  Util.Device.init();
  Util.Router.init();
  customElements.define('ic-app', AppComponent);
};

const noOfficeLaunch = () => {
  setTimeout(() => {
    window.Office = undefined;
    Office = undefined;
    launch();
  }, 100);
};

const loadOffice = () => {
  const replaceState = window.history.replaceState;
  const pushState = window.history.pushState;
  const script = document.createElement('script');
  script.onerror = (error) => {
    window.history.replaceState = replaceState;
    window.history.pushState = pushState;
    document.head.removeChild(script);
    noOfficeLaunch();
  };
  script.onload = () => {
    window.history.replaceState = replaceState;
    window.history.pushState = pushState;
    if (window.hasOwnProperty('Office')) {
      // Application-specific initialization code goes into a function that is
      // assigned to the Office.initialize event and runs after the Office.js initializes.
      // Bootstrapping of the AppModule must come AFTER Office has initialized.
      Office.onReady().then(info => {
        if (!!info && !!info.platform) {
          launch();
        } else {
          noOfficeLaunch();
        }
      });
    } else {
      launch();
    }
  };
  script.src = 'https://appsforoffice.microsoft.com/lib/1.1/hosted/office.debug.js';
  document.head.appendChild(script);
};
loadOffice();
