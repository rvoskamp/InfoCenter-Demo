import { Util } from '../utils/util.js';
import { Service } from '../services/service.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    .right {
      float: right;
    }
    .hidden {
      display: none;
    }
    .link {
      text-decoration: underline;
      cursor: pointer;
    }
  </style>
  <div>
    <h1>Home</h1>
    <button class="right" id="logoutbtn" role="button" tabindex="0">Logoff</button>
    <div>
      <p id="client"></p>
      <p id="user"></p>
      <p id="restapi"></p>
      <p id="token"></p>
      <p id="dst"></p>
    </div>
    <div id="tiles"></div>
    <ic-spinner></ic-spinner>
  </div>
`;  

export class HomeComponent extends HTMLElement {
  constructor() {
    super();
    this.tiles = [];
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.updateInfo();
  }

  connectedCallback() {
    const tilesEl = this.shadowRoot.getElementById('tiles');
    this.shadowRoot.getElementById('client').innerText = Util.Device.bIsOfficeAddin ? `Office Add-in client` : `Web client`;
    this.shadowRoot.getElementById('logoutbtn').onclick = this.logOff.bind(this);
    tilesEl.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.target;
      if (!!target && !!target.classList && !!target.classList.contains('link')) {
        const index = parseInt(target.id.substring(5));
        const tile = this.tiles[index];
        Util.Router.nav(`${tile.type}?desc=${encodeURIComponent(JSON.stringify(tile))}`);
      }
    };
    Util.RestAPI.get('/settings/tiles?library='+Util.RestAPI.getPrimaryLibrary()).then(tiles => {
      let tilesStr = 'Tiles: ';
      let sep = '';
      if (!!tiles) {
        tiles.forEach((tile, index) => {
          if (!tile.DOCNAME) {
            tile.DOCNAME = tile.name;
          }
          tilesStr += sep + `<span class="${Util.isContainer(tile.type)?'link':''}" id="item_${index}">${tile.name}</span>`;
          sep = ', ';
        });
      }
      this.shadowRoot.querySelector('ic-spinner').classList.add('hidden');
      tilesEl.innerHTML = tilesStr;
      this.tiles = tiles;
    }, err => {
      this.shadowRoot.querySelector('ic-spinner').classList.add('hidden');
      tilesEl.innerText = err.toString();
      tilesEl.onclick = undefined;
    });
  }

  disconnectedCallback() {
    this.shadowRoot.getElementById('logoutbtn').onclick = undefined;
    this.shadowRoot.getElementById('tiles').onclick = undefined;
  }

  updateInfo() {
    let newValue;
    let oldValue;
    newValue = `User: ${Util.RestAPI.getUserID()}`;
    oldValue = this.shadowRoot.getElementById('user').innerText;
    if (newValue !== oldValue) {
      this.shadowRoot.getElementById('user').innerText = newValue;
    }
    newValue = `Rest API: ${Util.RestAPI.getBaseURL()}`;
    oldValue = this.shadowRoot.getElementById('restapi').innerText;
    if (newValue !== oldValue) {
      this.shadowRoot.getElementById('restapi').innerText = newValue;
    }
    newValue = `oAuth token: ${Util.RestAPI.getAuthToken()}`;
    oldValue = this.shadowRoot.getElementById('token').innerText;
    if (newValue !== oldValue) {
      this.shadowRoot.getElementById('token').innerText = newValue;
    }
    newValue = `DST token: ${Util.RestAPI.getDSTToken()}`;
    oldValue = this.shadowRoot.getElementById('dst').innerText;
    if (newValue !== oldValue) {
      this.shadowRoot.getElementById('dst').innerText = newValue;
    }
    setTimeout(() => {
      this.updateInfo();
    }, 5000);
  }

  logOff(event) {
    if (!!event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const done = () => {
      this.shadowRoot.querySelector('ic-spinner').classList.add('hidden');
      Util.Router.navLogin();
    };
    this.shadowRoot.querySelector('ic-spinner').classList.remove('hidden');
    Util.RestAPI.logOff(true).then(() => {
      if (!!Service.oAuth2Service) {
        Service.oAuth2Service.logout().then(done, done);
      } else {
        done();
      }
    }, done);
  }
}
customElements.define('ic-home', HomeComponent);
