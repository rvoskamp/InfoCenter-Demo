const template = document.createElement('template');
template.innerHTML = `
  <style>
    .spinner {
      position: absolute; 
      top: calc(50% - 6rem);
      left: calc(50% - 3rem);
    }
    .spinner.mini {
      top: calc(50% - 3rem);
      left: calc(50% - 1rem);
    }
    .spinner:before {
      content: "";
      box-sizing: border-box;
      position: absolute;
      top: 50%;
      left: 50%;
      width: 6rem;
      height: 6rem;
      border-radius: 50%;
      border-top: 0.125rem solid #07d;
      border-right: 0.125rem solid transparent;
      animation: spinner 0.6s linear infinite;
    }
    .spinner.mini:before {
      width: 2rem;
      height: 2rem;
    }
    @keyframes spinner { to { transform: rotate(360deg); } }
  </style>
  <div class="spinner"></div>
`;
export class SpinnerComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  static get observedAttributes() {
    return ['size'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'size') {
      if (newValue === 'mini') {
        this.shadowRoot.querySelector('div').classList.add('mini');
      } else {
        this.shadowRoot.querySelector('div').classList.remove('mini');
      }
    }
  }
}
customElements.define('ic-spinner', SpinnerComponent);
