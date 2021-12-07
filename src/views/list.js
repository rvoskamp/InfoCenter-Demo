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
  </style>
  <div>
    <h1 class="header" id="name"></h1>
    <div class="containerwrapper">
      <div class"container" id="container"></div>
    </div>
    <ic-spinner></ic-spinner>
  </div>
`;  

export class ListComponent extends HTMLElement {
  constructor() {
    super();
    this.desc = null;
    this.listData = {list:[], set:{}};
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  static get observedAttributes() {
    return ['desc'];
  }

  listItemsChanged() {
    let inner = '';
    for (const item of this.listData.list) {
      inner += `<ic-listitem desc=${encodeURIComponent(JSON.stringify(item))}></ic-listitem>`;
    }
    this.shadowRoot.getElementById('container').innerHTML = inner;
  }

  requestItems() {
    this.listData = {list:[], set:{}};
    if (!!this.desc) {
      const url = `/${this.desc.type}${!!this.desc.id?('/'+this.desc.id):''}?library=${this.desc.lib || Util.RestAPI.getPrimaryLibrary()}&start=0&max=25`;
      this.shadowRoot.querySelector('ic-spinner').classList.remove('hidden');
      Util.RestAPI.get(url).then(data => {
        this.listData = data;
        this.shadowRoot.querySelector('ic-spinner').classList.add('hidden');
        this.listItemsChanged();
      }, err => {
        this.listData = {list:[], set:{}};
        this.shadowRoot.querySelector('ic-spinner').classList.add('hidden');
        this.listItemsChanged();
      });
      this.shadowRoot.getElementById('name').innerHTML = this.desc.DOCNAME;
      name
    } else {
      this.listItemsChanged();
    }
  }

  connectedCallback() {
    this.requestItems();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'desc') {
      this.desc = JSON.parse(decodeURIComponent(newValue));
      this.requestItems();
    }
  }
}
customElements.define('ic-list', ListComponent);
