import { RestAPI } from './restful.js';
import { Device } from './device.js';
import { Router } from './router.js';

export const Util = {
  Device: new Device(),
  Router: new Router(),
  RestAPI: new RestAPI(),

  siteConfig: null,
  parseUrlOptions: {
    strictMode: true,
    key: ['source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'],
    q: {
      name: 'queryKey',
      parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: {
      strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
      loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    }
  },
  getParams: (uri) => {
    let uriQuery = uri['query'];
    if (uriQuery.endsWith('=)')) {
      uriQuery = uriQuery.substr(0,uriQuery.length - 2);
    }
    const ret = {};
    const seg = uriQuery.replace(/^\?/, '').split('&');
    const len = seg.length;

    for (let i=0; i < len; i++) {
      if (!seg[i]) {
       continue;
      }
      const singleSplit = (segment) => {
        const equalPos = segment.indexOf('=');
        const key = segment.substring(0,equalPos);
        const value = segment.substring(equalPos+1);
        ret[key] = value;
      };
      singleSplit(seg[i]);
    }
    return ret;
  },
  parseURL: (str) => {
    const o = Util.parseUrlOptions;
    const	m = o.parser[o.strictMode ? 'strict' : 'loose'].exec(str);
    const	uri = {};
    let	i = 14;

    while (i--) {
      uri[o.key[i]] = m[i] || '';
    }
    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, ($0, $1, $2) => {
      if ($1) {
        uri[o.q.name][$1] = $2;
      }
    });
    uri['params'] = Util.getParams(uri);
    uri['path'] = uri['path'].split('/');
    return uri;
  },
  b64EncodeUnicode: (str) => {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt('0x' + p1, 16))));
  },
  b64DecodeUnicode: (str) => {
    return decodeURIComponent(atob(str).replace(/(.)/g, (match, p) => {
      let code = p.charCodeAt(0).toString(16).toUpperCase();
      if (code.length < 2) {
        code = '0' + code;
      }
      return '%' + code;
    }));
  },
  b64UrlDecode: (str) => {
    let output = str.replace(/-/g, '+').replace(/_/g, '/');
    switch (output.length % 4) {
      case 0:
        break;
      case 2:
        output += '==';
        break;
      case 3:
        output += '=';
        break;
      default:
        throw new Error('Illegal base64url string');
    }
    try {
      return Util.b64DecodeUnicode(output);
    } catch (err) {
      return atob(output);
    }
  },
  decodeJWT: (token) => {
    const decodeTokenComponent = (value) => JSON.parse(Util.b64UrlDecode(value.split('.')[0]));
    const [headerEncoded, payloadEncoded, signature] = token.split('.');
    const [header, payload] = [headerEncoded, payloadEncoded].map(decodeTokenComponent);
    return payload;
  },
  getRootSiteUrl: () => {
    const path = location.pathname;
    const pathParts = path.split('/');
    pathParts.splice(pathParts.length-1, 1);
    return location.origin + pathParts.join('/');
  },
  getSiteData: (url) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const fullUrl = Util.getRootSiteUrl() + (url.startsWith('/') ? '' : '/') + url;
      xhr.open('GET', fullUrl, true);
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200 || xhr.status === 206) {
            try {
              const responseObj = xhr.response ? JSON.parse(xhr.response) : null;
              if (!!responseObj) {
                resolve(responseObj);
              } else {
                reject('no data');
              }
            } catch (e) {
              reject(e);
            }
          } else {
            reject(xhr.statusText);
          }
        }
      };
      xhr.onerror = reject;
      xhr.send();
    });
  },
  getSiteConfig: () => {
    if (!!Util.siteConfig) {
      return Promise.resolve(Util.siteConfig);
    }
    return Util.getSiteData('assets/config.json').then(data => {
      Util.siteConfig = data;
      return Util.siteConfig;
    }, err => {
      return {};
    });
  },
  getQueryFromURL: (url, key) => {
    const urlParts = Util.parseURL(url);
    return urlParts.params[key];
  },
  getQueriesFromURL: (url) => {
    const urlParts = Util.parseURL(url);
    return urlParts.params;
  },
  getUserLanguage: (withCountry) => {
    const nav = window.navigator;
    let browserLang = (nav.languages && nav.languages.length>0) ? nav.languages[0] : (nav.language || nav.browserLanguage || nav.userLanguage);
    if (browserLang && !withCountry) {
      if (browserLang.indexOf('-') !== -1) {
        browserLang = browserLang.split('-')[0];
      }
      if (browserLang.indexOf('_') !== -1) {
        browserLang = browserLang.split('_')[0];
      }
    }
    return browserLang;
  },
  formatIcon: (desc) => {
    let name = 'mime_document2.svg';
    if (!!desc && !!desc.type) {
      switch (desc.type) {
        case 'folders':
          name = 'mime_folder.svg';
          break;
        case 'workspaces':
          name = 'mime_workspace.svg';
          break;
        case 'searches':
          name = 'mime_saved_search.svg';
          break;
        case 'docuemnts': 
          name = 'mime_document2.svg';
          break;
      }
    }
    return `./assets/images/${name}`;
  },
  formatDate: (dateStr, dateOnly) => {
    let result = '';
    if (dateStr && dateStr.length && dateStr !== '0 UTC' && dateStr.substring(0,4) !== '1753') {
      const conformDateStr = dateStr.indexOf('z')>0 || dateStr.indexOf('Z')>0 ? dateStr : dateStr.replace(/-/g, '/');
      const date = new Date(conformDateStr);
      const locale = Util.getUserLanguage(true);
      result = date.toLocaleDateString(locale);
      if (!dateOnly) {
        result += ' ' + date.toLocaleTimeString(locale);
      }
    }
    return result;
  },
  isContainer: (type) => {
    if (type === 'searches' || type === 'folders' || type === 'flexfolders' || type === 'workspaces' || type === 'fileplans' || type === 'boxes' || type === 'requests' || type === 'activities') {
      return true;
    }
    return false;
  }
};
