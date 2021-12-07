import { Util } from '../utils/util.js';

const kStoreKey = 'edx_oauth2_sso';
const kExpiryKey = 'edx_oauth2_expires_at';

const _getAuthData = () => {
  let auth = null;
  const authStorage = localStorage.getItem(kStoreKey);
  if (authStorage) {
    try {
      auth = JSON.parse(authStorage);
    } catch (e) {
      auth = null;
    }
  }
  return auth;
};

const _getExpiryMS = (token) => {
  let expiresInMilliSeconds = 0;
  if (!!token) {
    const payload = Util.decodeJWT(token);
    if (!!payload) {
      const delta = payload.exp - payload.iat;
      expiresInMilliSeconds = delta * 90;  // 90% in MS
    }
  } else {
    const expiresAtStr = localStorage.getItem(kExpiryKey);
    if (!!expiresAtStr) {
      const expiresAt = parseInt(expiresAtStr);
      const now = new Date();
      expiresInMilliSeconds = expiresAt - now.getTime();
      if (expiresInMilliSeconds < 0) {
        expiresInMilliSeconds = 0;
      }
    }
  }
  return expiresInMilliSeconds;
};

const _getExpiresAt = (token) => {
  let expiresAt = 0;
  if (!!token) {
    const expiresInMilliSeconds = _getExpiryMS(token);
    const now = new Date();
    expiresAt = now.getTime() + expiresInMilliSeconds;
  } else {
    const expiresAtStr = localStorage.getItem(kExpiryKey);
    if (!!expiresAtStr) {
      expiresAt = parseInt(expiresAtStr);
    }
  }
  return expiresAt;
};

const _setExpiresAt = (expiresAt) => {
  localStorage.setItem(kExpiryKey, expiresAt.toString());
};

class SilentRefresher {
  constructor() {
    this._resolve = null;
    this._reject = null;  
    this._boundMessageEvent = this._message.bind(this);
    window.addEventListener('message', this._boundMessageEvent, false);
    this._frame = window.document.createElement('iframe');
    this._frame.style.visibility = 'hidden';
    this._frame.style.position = 'absolute';
    this._frame.style.display = 'none';
    this._frame.style.width = '0px';
    this._frame.style.height = '0px';
    window.document.body.appendChild(this._frame);
  }

  get origin() {
    return location.protocol + '//' + location.host;
  }

  _success(data) {
    this._cleanup();
    this._resolve(data);
  }

  _error(message) {
    this._cleanup();
    this._reject(new Error(message));
  }

  _cleanup() {
    if (!!this._frame) {
      window.removeEventListener('message', this._boundMessageEvent, false);
      window.document.body.removeChild(this._frame);
      this._frame = null;
      this._boundMessageEvent = null;
    }
  }

  _message(event) {
    if (event.origin === this.origin && event.source === this._frame.contentWindow) {
      const date = new Date();
      const dateStr = date.getHours() + ':'  + date.getMinutes() + ':'  + date.getSeconds() + ' : ';
      if (!!event.data) {
        try {
          const data = JSON.parse(event.data);
          if (!!data.token) {
            this._success(data);
          } else {
            this._error(`${dateStr} No token in data from frame: ${event.data}`);
          }
        } catch (e) {
          this._error(`${dateStr} Invalid json from frame: ${e.message || e}`);
        }
      } else {
        this._error(`${dateStr} Invalid response from frame: ${event.origin + ' - ' + event.source}`);
      }
    }
  }

  async navigate(url) {
    const promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
    if (!!url) {
      this._frame.src = url;
    } else {
      this._error('No url provided');
    }
    return promise;
  }

  close() {
    this._cleanup();
  }
}

class TokenRefresher {
  constructor(refreshMS, token, callback) {
    this.timer = null;
    this.token = token;
    this.callback = callback;
    this.start(refreshMS);
  }

  start(refreshMS) {
    let expiresAt;
    if (!refreshMS) {
      refreshMS = _getExpiryMS(this.token);
      expiresAt = _getExpiresAt(this.token);
      _setExpiresAt(expiresAt);
    }
    this.timer = setTimeout(() => {
      const loc = Util.getRootSiteUrl();
      const silentRefresher = new SilentRefresher();
      silentRefresher.navigate(`${loc}/assets/silent-callback.html`).then(data => {
        this.token = data.token;
        this.callback.refreshed(this.token, null);
        expiresAt = _getExpiresAt(this.token);
        _setExpiresAt(expiresAt);
        this.start(_getExpiryMS(this.token));
      }, err => {
        this.callback.refreshed(null, err);
        console.error(err);
      });
    }, refreshMS);
  }

  stop() {
    clearTimeout(this.timer);
    this.timer = null;
  }
}

export class oAuth2Service {
  constructor() {
    this.bInitDone = false;
    this.currentToken = null;
    this.bOfficeAuth = false;
    this.loginResolve = null;
    this.loginReject = null;
    this.logoutResolve = null;
    this.officeDialog = null;
    this.authWindow = null;
    this.tokenRefresher = null;
    this.config = null;
    this.ssoData = null;
    this.boundHandleMessage = this.handleMessage.bind(this);
    const waitInit = () => {
      if (Util.Device.initialized()) {
        this.bOfficeAuth = Util.Device.bIsOfficeAddin && !Util.Device.bIsOfficeAddinWeb && !!Office && !!Office.context;
        if (!this.bOfficeAuth) {
          addEventListener('message', event => {
            if (typeof event.data === 'string') {
              if (!!this.authWindow) {
                this.authWindow.close();
                this.authWindow = null;
              }
              let data = {};
              try {
                data = JSON.parse(event.data);
              } catch (e) {
                data = {error:e.toString()};
              }
              if (!!data.token) {
                if (this.currentToken !== data.token) {
                  this.currentToken = data.token;
                  Util.RestAPI.setSSOAccessToken(this.currentToken);
                }
                if (!!this.loginResolve) {
                  this.tokenRefresher = new TokenRefresher(0, this.currentToken, this);
                  this.loginResolve(this.currentToken);
                  this.loginReject = null;
                  this.loginResolve = null;
                }
              } else if (!!this.loginReject) {
                this.loginReject(data.error);
                this.loginReject = null;
                this.loginResolve = null;
              } else if (!!this.logoutResolve) {
                this.logoutResolve();
                this.logoutResolve = null;
              } else {
                this.login(this.ssoData).then(() => {}, err => {
                  Util.RestAPI.logOff(true);
                  console.log(err.toString());
                });
              }
            }
          }, false);
        }
        this.bInitDone = true;
      } else {
        setTimeout(waitInit, 100);
      }
    };
    waitInit();
  }

  refreshed(token, error) {
    if (!!token) {
      if (this.currentToken !== token) {
        this.currentToken = token;
        Util.RestAPI.setSSOAccessToken(this.currentToken);
      }
      if (!!this.loginResolve) {
        this.loginResolve(this.currentToken);
        this.loginResolve = null;
        this.loginReject = null;
      }
    } else {
      const loc = Util.getRootSiteUrl();
      if (!!error) {
        console.log(error);
      }
      if (this.bOfficeAuth) {
        const url = `${loc}/assets/signin-office.html?state=${encodeURIComponent(JSON.stringify(this.ssoData))}`;
        Office.context.ui.displayDialogAsync(url, {height: 40, width: 25}, asyncResult => {
          if (!!asyncResult && !!asyncResult.value) {
            this.officeDialog = asyncResult.value;
            this.officeDialog.addEventHandler(Office.EventType.DialogMessageReceived, this.boundHandleMessage);
          } else {
            if (!!this.loginReject) {
              if (!!asyncResult.error) {
                this.loginReject(asyncResult.error);
              } else {
                this.loginReject('office login unknown error');
              }
            }
            this.loginResolve = null;
            this.loginReject = null;
          }
        });
      } else {
        this.showAuthWindow(`${loc}/assets/signin.html?state=${encodeURIComponent(JSON.stringify(this.ssoData))}`);
      }
    }
  }

  handleMessage(arg) {
    let err = 'unknown err';
    if (!!arg && !!arg.message) {
      try {
        const data = JSON.parse(arg.message);
        if (!!data.token) {
          this.currentToken = data.token;
          Util.RestAPI.setSSOAccessToken(this.currentToken);
          this.tokenRefresher = new TokenRefresher(0, this.currentToken, this);
          err = null;
        } else {
          err = data.error;
        }
      } catch (e) {
        err = !!e.message || e;
      }
    }
    if (!!err) {
      console.error(err);
    }
    if (!!this.loginResolve && !err) {
      this.loginResolve(this.currentToken);
    } else if (!!this.loginReject) {
      this.loginReject(err);
    }
    if (!!this.officeDialog) {
      this.officeDialog.close();
    }
    if (!!this.authWindow) {
      this.authWindow.close();
    }
    this.authWindow = null;
    this.officeDialog = null;
    this.loginResolve = null;
    this.loginReject = null;
  }

  showAuthWindow(url) {
    const childWin = this.authWindow = window.open(url, '_blank', 'location=no,toolbar=no,width=500,height=500,left=100,top=100;');
    const checkForClosed = () => {
      if (childWin.closed) {
        setTimeout(() => {
          if (!!this.authWindow) {
            // user closed it so no notifications
            this.authWindow = null;
            if (!!this.loginReject) {
              this.loginReject('user canceled');
            }
            this.loginReject = null;
            this.loginResolve = null;
          }
        }, 1000);
      } else {
        setTimeout(checkForClosed, 1000);
      }
    };
    checkForClosed();
  }

  async login(singleSignOnData) {
    const rc = new Promise((resolve, reject) => {
      this.loginResolve = resolve;
      this.loginReject = reject;
    });
    const doSignIn = async () => {
      const loc = Util.getRootSiteUrl();
      if (this.bOfficeAuth) {
        const mainH = Util.Device.height;
        const height = mainH < 400 ? 80 : mainH < 500 ? 70 : mainH < 600 ? 60 : mainH < 700 ? 50 : mainH < 800 ? 40 : 30;
        Office.context.ui.displayDialogAsync(`${loc}/assets/signin-office.html?state=${encodeURIComponent(JSON.stringify(this.ssoData))}`, {height, width: 20}, asyncResult => {
          if (!!asyncResult && !!asyncResult.value) {
            this.officeDialog = asyncResult.value;
            this.officeDialog.addEventHandler(Office.EventType.DialogMessageReceived, this.boundHandleMessage);
          } else {
            if (!!asyncResult.error) {
              this.loginReject(asyncResult.error);
            } else {
              this.loginReject('office login unknown error');
            }
            this.loginResolve = null;
            this.loginReject = null;
           }
        });
      } else {
        this.showAuthWindow(`${loc}/assets/signin.html?state=${encodeURIComponent(JSON.stringify(this.ssoData))}`);
      }
    };
    const waitInit = async () => {
      if (this.bInitDone) {
        this.ssoData = singleSignOnData;
        const auth = _getAuthData();
        if (!!auth && !!auth.tokens && auth.tokens.access_token) {
          const getConfig = (authority) => {
            Util.RestAPI.getExternalData(authority + '/.well-known/openid-configuration', null).then(data => {
              let expiryMS = 0;
              this.config = data;
              if (!!auth.config && auth.config.authorization_endpoint === this.config.authorization_endpoint && (expiryMS = _getExpiryMS())!==0) {
                this.tokenRefresher = new TokenRefresher(expiryMS, auth.tokens.access_token, this);
                this.refreshed(auth.tokens.access_token, null);
              } else {
                doSignIn();
              }
            } , err3 => {
              this.loginReject(err3);
              this.loginResolve = null;
              this.loginReject = null;
            });
          };
          getConfig(this.ssoData.authority);
        } else {
          await doSignIn();
        }
      } else {
        setTimeout(waitInit, 100);
      }
    };
    await waitInit();
    return rc;
  }

  async logout() {
    return new Promise((resolve, reject) => {
      if (!!this.tokenRefresher) {
        this.tokenRefresher.stop();
        this.tokenRefresher = null;
      }
      if (!!this.currentToken) {
        const loc = Util.getRootSiteUrl();
        const url = `${loc}/assets/signout-start.html`;
        const done = (err) => {
          this.officeDialog = null;
          this.authWindow = null;
          localStorage.removeItem(kStoreKey);
          localStorage.removeItem(kExpiryKey);
          if (!!err) {
            reject(err);
          } else {
            resolve();
          }
        };
        setTimeout(() => {
          if (!!this.officeDialog) {
            this.officeDialog.close();
            done();
          } else if (!!this.authWindow) {
            this.authWindow.close();
            done();
          }
        }, 5000);
        if (this.isOfficeAddin) {
          Office.context.ui.displayDialogAsync(url, {height: 30, width: 20}, asyncResult => {
            if (!!asyncResult && !!asyncResult.value) {
              this.officeDialog = asyncResult.value;
              this.officeDialog.addEventHandler(Office.EventType.DialogMessageReceived, arg => {
                let err = 'unknown err';
                if (!!arg && !!arg.message) {
                  try {
                    const data = JSON.parse(arg.message);
                    if (!!data.success) {
                      err = null;
                    } else {
                      err = data.error;
                    }
                  } catch (e) {
                    err = !!e.message || e;
                  }
                }
                done(err);
              });
            } else {
              done('office login unknown error');
            }
          });
        } else {
          this.logoutResolve = resolve;
          this.showAuthWindow(url);
        }
      } else {
        localStorage.removeItem(kStoreKey);
        localStorage.removeItem(kExpiryKey);
        resolve();
      }
    });
  }

  reset() {
    this.serverChanged();
    if (!!this.userManager) {
      this.userManager.clearStaleState();
      this.userManager.removeUser();
    }
    this.currentToken = null;
  }

  serverChanged() {
    localStorage.removeItem(kStoreKey);
    localStorage.removeItem(kExpiryKey);
  }

  get accessToken() {
    return this.currentToken;
  }
}
