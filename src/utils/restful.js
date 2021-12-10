const kAPIVersion = '1.0';
const kLibsReq = 'libraries?configuration';
const kConnectReq = 'connect';
const kOAuthKey = 'X-DM-AUTH';
const kDSTKey = 'X-DM-DST';
const kSessAuthKey = 'SESSION_AUTHORIZATION';
const kSessDurKey = 'SESSION_DURATION';
const kNoOp = (x) => { };

export class RestAPI {
  constructor() {
    this.boundReportError = this.reportErr.bind(this);
    this.apiPathVersion = '/edocsapi/v' + kAPIVersion;
    this.config = null;
    this.baseURL = '';
    this.loginReply = null;
    this.oAuthToken = null;
  }

  setBaseURL(baseURL) {
    if (this.baseURL !== baseURL) {
      this.baseURL = baseURL;
    }
  }

  getBaseURL() {
    return this.baseURL;
  }

  getServerURLOrigin() {
    return this.baseURL + this.apiPathVersion;
  }

  getSessionHeaders() {
    return this.loginReply?.HEADERS || {};
  }

  getPrimaryLibrary() {
    return this.config?.libraries[0] || null;
  }

  resetConfig() {
    this.config = null;
  }

  isLoggedIn() {
    return Object.keys(this.getSessionHeaders()).length !== 0;
  }

  getAuthToken() {
    return this.isLoggedIn() ? this.getSessionHeaders()[kOAuthKey] : this.oAuthToken;
  }

  getDSTToken() {
    return this.getSessionHeaders()[kDSTKey];
  }

  getUserID() {
    return this.loginReply?.USER_ID || 'unknown';
  }

  getFullName() {
    return this.loginReply?.FULL_NAME || 'unknown';
  }

  setSSOAccessToken(value) {
    const headers = this.getSessionHeaders();
    if (!!value) {
      this.oAuthToken = value;
      if (this.isLoggedIn()) {
        headers[kOAuthKey] = value;
        if (this.isLoggedIn()) {
          this.refreshSession().then(kNoOp, err => {
            headers = {};
            this.reportErr(err);
          });
        }
      }
    } else {
      if (!!headers[kOAuthKey]) {
        delete headers[kOAuthKey];
      }
      this.oAuthToken = null;
    }
  }

  addTZInfoToLogin(data) {
    const now = new Date();
    const jan = new Date(now.getFullYear(), 0, 1);
    const jul = new Date(now.getFullYear(), 6, 1);
    const tzOffset = now.getTimezoneOffset();
    const stdTZOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
    data['tzOffset'] = tzOffset;
    data['tzDST'] = tzOffset < stdTZOffset ? true : false;
    return data;
  }

  restAPIVersion() {
    let rc = 0x00160301;  // of the form 00 major minor dot
    if (this.loginReply && this.loginReply.SERVER_INFO && this.loginReply.SERVER_INFO.VERSION) {
      rc = this.numerateVersion(this.loginReply.SERVER_INFO.VERSION);
    }
    return rc;
  }

  numerateVersion(versionString) {
    let rc = 0x00000000;  // of the form 00 major minor dot
    const parts = versionString.split('.');
    let nParts = parts.length;
    if (nParts > 3) {
      nParts = 3;
    } // Use only first 3 version values
    if (nParts===3) {
      let value = '0x00';
      for (let i=0; i<nParts; i++) {
        if (parts[i].length===1) {
          value += '0';
        }
        value += parts[i];
      }
      rc = parseInt(value);
    }
    return rc;
  }
  
  escapeFileName(fileName) {
    return fileName.replace(/[ \[\]=|\,;^<>\t\r\n\\\.*?:\"/'+]/g,'_');
  }

  isExternalLib(lib) {
    if (!!lib) {
      const externalPrefix = !!this.loginReply['EXTERNAL_LIB_PREFIX'] ? this.loginReply['EXTERNAL_LIB_PREFIX'] : 'ex_';
      if (lib.toUpperCase().startsWith(externalPrefix.toUpperCase())) {
        return true;
      }
    }
    return false;
  }
  
  makeURL(desc, params, queryargs, plainID) {
    let url = '/' + desc.type + (desc.id === '' ? '' : ('/' + (plainID ? desc.id : encodeURIComponent(desc.id))));
    if (params) {
      url += '/' + params;
    }
    url += '?library=' + (desc.lib || this.getPrimaryLibrary());
    if (!!queryargs) {
      if (url.indexOf('?library=') !== -1 && queryargs.indexOf('?library=') !== -1) {
        const queryargParts = queryargs.split('&');
        if (queryargParts.length>1) {
          queryargParts.splice(0,1);
          queryargs = queryargParts.join('&');
        } else {
          queryargs = '';
        }
      }
      url += (queryargs.startsWith('&') ? '' : '&') + queryargs;
    }
    return url;
  }

  makeFileInfoURL(desc, version, token) {
    version = version || 'C';
    if (!desc.id && desc['DOCNUMBER']) {
      desc.id = desc['DOCNUMBER'];
    }
    return this.makeURL(desc,'versions/'+version,'fileinfo' + (token ? '&token' : ''));
  }
  
  makeDragURL(desc, version, queryargs) {
    queryargs = queryargs ? (queryargs + '&download') : 'download';
    return this.makeURL(desc,'versions/'+version,queryargs);
  }

  async getFileDownloadInfo(item, itemVers, shortName, asToken, ignoreVersion) {
    return await this.get(this.makeFileInfoURL(item, itemVers, asToken)).then(data => {
      const vers_id = data.version || itemVers;
      const vers_lbl = data.version_label ? data.version_label : vers_id;
      const url = this.getServerURLOrigin() + (asToken ? ('/documents/' + data.tokenid) : this.makeDragURL(item, (itemVers==='zip' ? 'zip' : vers_id)));
      let fileName = this.escapeFileName(item.DOCNAME);
      if (itemVers==='zip') {
        fileName += '.zip';
      } else if (shortName) {
        fileName = fileName + '.' + data.FILE_EXTENSION;
      } else if (this.isExternalLib(item.lib)) {
       fileName = item.DOCNAME;
      } else {
       fileName = item.lib + this.docIDKey + item.id + (ignoreVersion ? '' : '-v' + vers_lbl) + '-' + fileName + '.' + data.FILE_EXTENSION;
      }
      return {name:fileName,url,size:data.filesize,versionLabel:vers_lbl};
    }).catch(error => ({name:null,url:null,size:0}));
  }

  getFileToken(item, itemVers, shortName, ignoreVersion) {
    return this.getFileDownloadInfo(item, itemVers, shortName, true, ignoreVersion);
  }

  downloadFileWithBrowserAnchor(desc, version) {
    const formData = { DOCUMENTS: [desc] };
    this.getFileToken(desc, version || 'C', true).then(tokenData => {
      if (!!tokenData && tokenData.url && tokenData.name) {
        const noSSL = !location.href.toLowerCase().startsWith('https://');
        const dAnchor = document.createElement('a');
        dAnchor['download'] = 'download';
        dAnchor.target = '_blank';
        dAnchor.classList.add('download-iframe');
        dAnchor.style.display = 'none';
        dAnchor.href = tokenData.url + (noSSL ? '?share' : '');
        document.body.appendChild(dAnchor);
        dAnchor.click();
      }
    }, err => {
      this.notify.warning(title, err);
    });
  }

  async getConfig() {
    if (!this.config) {
      const data = await this.get(kLibsReq);
      this.config = data;
    }
    return Promise.resolve(this.config);
  }

  async connect(userid, password) {
    let error;
    if (!this.config) {
      this.config = await this.getConfig();
    }
    const library = this.getPrimaryLibrary();
    this.loginReply = null;
    const data = !!this.oAuthToken ? { library } : { library, userid, password  };
    await this.post(kConnectReq, this.addTZInfoToLogin(data)).then(loginReply => {
      if (this.oAuthToken) {
        loginReply.HEADERS[kOAuthKey] = this.oAuthToken;
      }
      this.loginReply = loginReply;
    }, error1 => {
      error = error1;
      this.reportErr(error);
    });
    if (!!error || !this.loginReply) {
      return Promise.reject(error);
    }
    return Promise.resolve(true);
  }

  async logOff(bDMLogout) {
    const finishLogOff = () => {
      this.loginReply = null;
      return Promise.resolve();
    };
    if (this.restAPIVersion() >= 0x00160702 && bDMLogout) {
      await this.get('disconnect').then(finishLogOff, finishLogOff);
    } else {
      finishLogOff();
    }
  }

  // private methods
  reportErr(err) {
    console.log(err);
  }
  async refreshSession() {
    return new Promise((resolve, reject) => {
      const sessionInfo = {};
      sessionInfo[kSessAuthKey] = this.loginReply[kSessAuthKey];
      setTimeout(() => {
        this.post('/refresh', sessionInfo).then(aReply => {
          this.loginReply[kSessAuthKey] = aReply[kSessAuthKey];
          this.loginReply[kSessDurKey] = aReply[kSessDurKey];
          if (aReply[kDSTKey]) {
            this.getSessionHeaders()[kDSTKey] = aReply[kDSTKey];
          }
          resolve(true);
        }, error => {
          reject(error);
        });
      }, 1);
    });
  }
  async get(url) {
    return await this.doVerb('GET', url);
  }
  async put(url, data) {
    return await this.doVerb('PUT', url, data);
  }
  async post(url, data) {
    return await this.doVerb('POST', url, data);
  }
  async delete(url) {
    return await this.doVerb('DELETE', url);
  }
  async getExternalData(fullUrl) {
    return await this.doVerb('GET', null, null, fullUrl);
  }
  async doVerb(method, url, data, fullUrl) {
    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const barEscapedUrl = fullUrl || url.replace(/[|]/g, '%7C');
      fullUrl = fullUrl || (this.getServerURLOrigin() + (barEscapedUrl.startsWith('/') ? '' : '/') + barEscapedUrl);
      xhr.open(method, fullUrl, true);
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200 || xhr.status === 206) {
            try {
              const responseObj = !!xhr.responseText && xhr.responseText[0] === '{' ? JSON.parse(xhr.response) : xhr.response;
              resolve(!!responseObj && !!responseObj.data ? responseObj.data : responseObj);
            } catch (e) {
              reject(e.toString());
            }
          } else {
            reject(xhr.statusText);
          }
        }
      };
      if (url === kConnectReq) {
        if (this.oAuthToken) {
          xhr.setRequestHeader(kOAuthKey, this.oAuthToken);
        }
      } else if (url !== kLibsReq) {
        const hdrs = this.getSessionHeaders();
        const keys = Object.keys(hdrs);
        for (const key of keys) {
          xhr.setRequestHeader(key, hdrs[key]);
        }
      }
      xhr.onerror = reject;
      if (!!data) {
        xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        data = JSON.stringify({ data });
      }
      xhr.withCredentials = true;
      xhr.send(data);
    });
  }
}
