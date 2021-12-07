import { Util } from '../utils/util.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    .hidden {
      display: none;
    }
    .header {
      width: 100%;
      height: 3rem;
    }
    .containerwrapper {
      width: 100%;
      height: calc(100% - 3rem);
      overflow-x: hidden;
      overflow-y: scroll;
    }
    .container {
      width: calc(100% - 1rem);
    }
    .item {
      height: 4rem;
    }
    .inline {
      display: inline-block;
    }
    .link img {
      cursor: pointer;
    }
    img {
      height: 2rem;
      width: 2rem;
    }
  </style>
  <div class="link" id="item"></div>
  <ic-spinner></ic-spinner>
  </div>
`;  

export class ListItemComponent extends HTMLElement {
  constructor() {
    super();
    this.desc = null;
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  static get observedAttributes() {
    return ['desc'];
  }

  descChanged() {
    const itemEl = this.shadowRoot.getElementById('item');
    let inner = '';
    if (!!this.desc) {
      inner = `
        <img src="${Util.formatIcon(this.desc)}">
        <div class="inline">${this.desc.DOCNUM || '-1'}</div>
        <div class="inline">${this.desc.DOCNAME || 'no docame'}</div>
        <div class="inline">${this.desc.AUTHOR_ID || 'no author'}</div>
        <div class="inline">${Util.formatDate(this.desc.LAST_EDIT_DATE) || 'no date'}</div>
      `;
      itemEl.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (Util.isContainer(this.desc.type)) {
          Util.Router.nav(`${this.desc.type}?desc=${encodeURIComponent(JSON.stringify(this.desc))}`);
        } else if (this.desc.type ==='documents') {
          Util.RestAPI.downloadFileWithBrowserAnchor(this.desc);
        }
      };
    }
    itemEl.innerHTML = inner;
    this.shadowRoot.querySelector('ic-spinner').classList.add('hidden');
  }

  connectedCallback() {
    this.descChanged();
  }

  disconnectedCallback() {
    this.shadowRoot.getElementById('item').onclick = undefined;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'desc') {
      this.desc = JSON.parse(decodeURIComponent(newValue));
      this.descChanged();
    }
  }
}
customElements.define('ic-listitem', ListItemComponent);
