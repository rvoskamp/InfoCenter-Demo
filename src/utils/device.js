export const UserInterface = Object.freeze({ web:0, desktop:1, phone:2, tablet:3 });

const kPhoneWidth = 639;

export class Device {
  constructor() {
    const isTabletSize = window.innerWidth>kPhoneWidth && window.innerHeight>kPhoneWidth;
    const navAgentStr = navigator.userAgent.toLowerCase();
    const browserWindowResized = () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
    };
    this.bInitStarted = false;
    this.bInitDone = false;
    this.bIsTabletSize = false;
    this.bIsWinSurface = false;
    this.bIsWinMobile = false;
    this.bIsAndroid = false;
    this.bIsBB10Device = false;
    this.bIsTouchDevice = false;
    this.bIsIOSDevice = false;
    this.bIsWindows = false;
    this.bIsMacintosh = false;
    this.bIsChrome = false;
    this.bIsSafari = false;
    this.bIsFirefox = false;
    this.bIsEdge = false;
    this.bIsIE = false;
    this.bIsOfficeAddin = false;
    this.bIsOfficeAddinWeb = false;
    this.bIsOfficeAddinDesktop = false;
    this.bIsOfficeAddinOutlook = false;
    this.bIsOfficeAddinOutlookMessageEditable = false;
    this.bIsOfficeAddinWord = false;
    this.bIsOfficeAddinExcel = false;
    this.bIsOfficeAddinPowerPoint = false;
    this.bUseWebLogin = false;
    this.width = 0;
    this.height = 0;
    this.ui = UserInterface.web;
    this.bIsWinSurface = !!((navAgentStr.indexOf('webview') >= 0) && (navAgentStr.indexOf('trident') >= 0));
    this.bIsWinMobile = !!(navAgentStr.indexOf('iemobile') >= 0);
    this.bIsAndroid = !!(!this.bIsWinMobile && (navAgentStr.indexOf('android') >= 0));
    this.bIsBB10Device = !!(!this.bIsWinMobile && !this.bIsAndroid && (navAgentStr.match(/BB10|BB11/i) !== null));
    this.bIsIOSDevice = !!(!this.bIsWinMobile && !this.bIsAndroid && !this.bIsBB10Device && (navAgentStr.match(/iPhone|iPod|iPad/i) !== null));
    this.bIsTouchDevice = this.bIsIOSDevice || this.bIsAndroid || this.bIsWinMobile || this.bIsWinSurface || this.bIsBB10Device;
    this.bIsWindows = navAgentStr.indexOf('windows') >= 0;
    this.bIsMacintosh = navAgentStr.indexOf('macintosh') >= 0;
    this.bIsEdge = (navAgentStr.indexOf('edge') >= 0);
    this.bIsIE = (navAgentStr.indexOf('trident') >= 0);
    this.bIsChrome = !this.bIsEdge && navAgentStr.indexOf('chrome') >= 0;
    this.bIsSafari = !this.bIsEdge && !this.bIsChrome && (navAgentStr.indexOf('safari') >= 0);
    this.bIsFirefox = !this.bIsEdge && !this.bIsSafari && !this.bIsChrome && (navAgentStr.indexOf('firefox') >= 0);
    if (this.bIsTouchDevice && isTabletSize) {
      this.ui = UserInterface.tablet;
    } else if (this.bIsTouchDevice) {
      this.ui = UserInterface.phone;
    }
    if (this.bIsTouchDevice) {
      addEventListener('orientationchange', browserWindowResized);
    }
    addEventListener('resize', browserWindowResized);
    setTimeout(() => {
      browserWindowResized();
    }, 1);
  }

  init() {
    if (!this.bInitStarted) {
      this.bIsOfficeAddin = window.hasOwnProperty('Office');
      this.bInitStarted = true;
      if (this.bIsOfficeAddin && Office && (Office.edx_test || Office.context && Office.context.platform)) {
        this.bIsOfficeAddin = true;
        this.ui = UserInterface.phone;
        if (Office.context && Office.context.platform) {
          this.bUseWebLogin = false;
          if (Office.context.platform.toLowerCase().indexOf('online')>=0) {
            this.bIsOfficeAddinWeb = true;
          } else {
            this.bIsOfficeAddinDesktop = true;
          }
          this.bIsOfficeAddinOutlook = !!Office.context.mailbox;
          this.bIsOfficeAddinOutlookMessageEditable = !!Office.context.mailbox && !!Office.context.mailbox.item && !!Office.context.mailbox.item.addFileAttachmentAsync;
          this.bIsOfficeAddinWord = window.hasOwnProperty('Word');
          this.bIsOfficeAddinExcel = window.hasOwnProperty('Excel');
          this.bIsOfficeAddinPowerPoint = window.hasOwnProperty('PowerPoint');
        } else {
          this.bIsOfficeAddinWeb = true;
        }
      } else {
        this.bIsOfficeAddin = false;
        if (this.isMobile()) {
          this.bIsTabletSize = !this.bIsOfficeAddin && screen.availWidth > kPhoneWidth && screen.availHeight > kPhoneWidth;
        }
      }
      this.bInitDone = true;
    }
  }

  initialized() {
    return this.bInitDone;
  }

  isMobile() {
    return this.ui>=UserInterface.phone;
  }

  isMobileDevie() {
    return this.isMobile() && !this.bIsOfficeAddin;
  }

  isPhoneLook() {
    return this.isMobile() && !this.bIsTabletSize;
  }

  isTabletLook() {
    return this.isMobile() && this.bIsTabletSize;
  }

  isWebLook() {
    return !this.isMobile() && this.ui!==UserInterface.desktop;
  }

  isDesktopLook() {
    return !this.isMobile() && this.ui===UserInterface.desktop;
  }

  isWhiteIconLook() {
    return this.isMobile() && !this.bIsOfficeAddin;
  }

  isPortrait() {
    if (typeof window === 'undefined' || typeof window.orientation === 'undefined') {
      return this.height> this.width;
    }
    return screen.orientation===0 || screen.orientation===180;
  }

  isLandscape() {
    return !this.isPortrait();
  }
}