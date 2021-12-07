import { Util } from '../utils/util.js';
import { Service } from '../services/service.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    .form-group {
      position: relative;
      margin: .5rem;
      font-size: 1.125rem;
    }
    .bottom-container {
      position: relative;
      text-align: center;
      width: 100%;
      margin-top: 3rem;
    }
    .hidden {
      display: none;
    }
    input {
      width: 20rem;
      max-width: 90%;
    }
  </style>
  <form>
    <fieldset>
      <div class="form-group hidden" id="server-wrapper">
        <input type="text" tabindex="0" placeholder="Rest API Server" id="server" name="server" required aria-required="true">
      </div>
      <span class="hidden" id="u-p-wrapper">
        <div class="form-group">
          <input type="text" tabindex="0" spellcheck="false" placeholder="User ID" id="userid" name="userid">
        </div>
        <div class="form-group">
          <input type="password" spellcheck="false" tabindex="0" placeholder="password" id="password" name="password">
        </div>
      </span>
      <div class="bottom-container">
        <ic-spinner class="hidden" size="mini"></ic-spinner>
        <button type="submit" id="loginbtn" role="button" tabindex="0"></button>
      </div>
    </fieldset>
  </form>
`;
export class LoginComponent extends HTMLElement {
  constructor() {
    super();
    this.oauth2Service;
    this.server;
    this.userid;
    this.password;
    this.ui = Util.Device.ui;
    this.isOfficeAddin = Util.Device.bIsOfficeAddin;
    this.loggingIn = false;
    this.curLib = '';
    this.ssoData = null;
    this.loggedIn = false;  
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    Util.RestAPI.resetConfig();
    this.oauth2Service = Service.oAuth2Service;
    Util.getSiteConfig().then(data => {
      if (!!data.restapi && data.restapi.length) {
        this.server = data.restapi;
        this.shadowRoot.getElementById('server').value = this.server;
        this.retrieveLibraries(false).then(() => {}, err => {});
      } else {
        this.shadowRoot.getElementById('server-wrapper').classList.remove('hidden');
      }
      if (!!data.showserver) {
        this.shadowRoot.getElementById('server-wrapper').classList.remove('hidden');
      }
    }, err => {
      this.shadowRoot.getElementById('server-wrapper').classList.remove('hidden');
    });
  }

  connectedCallback() {
    this.shadowRoot.querySelector('form').onsubmit = this.onSubmit.bind(this);
    this.shadowRoot.getElementById('server').onblur = this.serverChanged.bind(this);
    this.shadowRoot.getElementById('loginbtn').innerText = 'Login';
  }

  disconnectedCallback() {
    this.shadowRoot.querySelector('form').onsubmit = undefined;
    this.shadowRoot.getElementById('server').onblur = undefined;
  }

  isValid() {
    return !!this.server && ((!!this.userid && !!this.password) || !!this.ssoData);
  }

  canLogin() {
    return this.isValid() && !!Util.RestAPI.getPrimaryLibrary() && !this.loggedIn && !this.loggingIn;
  }

  handleError(error) {
    this.loggingIn = false;
    this.loginBtnText = 'Login';
    this.shadowRoot.getElementById('loginbtn').innerText = 'Login';
    console.log(error);
  }

  retrieveLibraries(changed) {
    Util.RestAPI.resetConfig();
    Util.RestAPI.setBaseURL(this.server);
    this.shadowRoot.querySelector('ic-spinner').classList.remove('hidden');
    return new Promise((resolve, reject) => {
      Util.RestAPI.getConfig().then(data => {
        const libraries = !!data && !!data.libraries ? data.libraries : data;
        this.ssoData = !!data && !!data.authentication && data.authentication.oidc_enabled ? data.authentication : null;
        this.shadowRoot.querySelector('ic-spinner').classList.add('hidden');
        if (!!libraries) {
          this.curLib = libraries[0];
          const showUserPswd = !this.ssoData && (!this.ssoData || !this.ssoData.oidc_required);
          if (showUserPswd) {
            this.shadowRoot.getElementById('u-p-wrapper').classList.remove('hidden');
          } else {
            this.shadowRoot.getElementById('u-p-wrapper').classList.add('hidden');
          }
          if (changed && !!this.ssoData) {
            this.oauth2Service.serverChanged();
          }
          resolve();
        } else {
          const err = {error:{rapi_code: 1}};
          this.handleError(err);
          reject(err);
        }
      }, err2 => {
        this.shadowRoot.querySelector('ic-spinner').classList.add('hidden');
        this.handleError(err2);
        reject(err2);
      });
    });
  }

  continueSubmit() {
    if (this.loggedIn) {
      this.loggingIn = false;
      this.shadowRoot.getElementById('loginbtn').innerText = 'Login';
      this.shadowRoot.querySelector('ic-spinner').classList.add('hidden');
      Util.RestAPI.loadHome().then(success => {
        if (!success) {
          this.loggedIn = false;
        }
      });
    } else if (!!this.ssoData) {
      const modernAuthErr = (maErr) => {
        this.oauth2Service.reset();
        this.handleError(maErr);
        this.ssoData = null;
        this.shadowRoot.getElementById('u-p-wrapper').classList.remove('hidden');
        this.shadowRoot.querySelector('ic-spinner').classList.add('hidden');
      };
      this.shadowRoot.querySelector('ic-spinner').classList.remove('hidden');
      this.oauth2Service.login(this.ssoData).then((token) => {
        Util.RestAPI.setSSOAccessToken(token);
        Util.RestAPI.connect(this.userid, this.password).then(success => {
          if (success) {
            this.shadowRoot.querySelector('ic-spinner').classList.add('hidden');
            Util.Router.navHome();
          } else {
            modernAuthErr({error:{rapi_code: 1}});
          }
        }, modernAuthErr);
      }, err => {
        modernAuthErr(err);
        setTimeout(() => {
         this.continueSubmit();
        }, 1);
      });
    } else if (!Util.RestAPI.getPrimaryLibrary()) {
      this.retrieveLibraries(true).then(() => {
        setTimeout(() => {
          this.continueSubmit();
        }, 1);
      }, err => {});
    } else {
      this.shadowRoot.querySelector('ic-spinner').classList.remove('hidden');
      Util.RestAPI.setSSOAccessToken(null);
      Util.RestAPI.connect(this.userid, this.password).then(success => {
        this.shadowRoot.querySelector('ic-spinner').classList.add('hidden');
        if (success) {
          Util.Router.navHome();
        } else {
          this.handleError({error:{rapi_code: 1}});
        }
      }, error => {
        this.shadowRoot.querySelector('ic-spinner').classList.add('hidden');
        this.handleError(error);
      });
    }
  }

  serverChanged(event) {
    this.server = event.target.value;
    if (!!this.server && (this.server.startsWith('https://') || (this.server.startsWith('http://') && !Util.Device.bIsOfficeAddin))) {
      this.retrieveLibraries(true).then(() => {}, err => {});
    } else {
      console.log('missing server');
    }
  }

  onSubmit(event) {
    if (!!event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.server = this.shadowRoot.getElementById('server')?.value || '';
    this.userid = this.shadowRoot.getElementById('userid')?.value || '';
    this.password = this.shadowRoot.getElementById('password')?.value || '';
    if (!this.server || (!this.server.startsWith('https://') && (!this.server.startsWith('http://') || Util.Device.bIsOfficeAddin))) {
      console.log('missing server');
    } else {
      this.loggingIn = !this.loggingIn;
      this.shadowRoot.getElementById('loginbtn').innerText = this.loggingIn ? 'Cancel' : 'Login';
      if (this.loggingIn) {
        this.continueSubmit();
      } else {
        Util.Router.reload();
      }
    }
  }
}
customElements.define('ic-login', LoginComponent);
