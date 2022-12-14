import { Component, OnInit, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { Camera, CameraResultType } from '@capacitor/camera';

import {
  IntuneMAM, IntuneMAMAppConfig, IntuneMAMGroupName,
  IntuneMAMPolicy, IntuneMAMUser, IntuneMAMVersionInfo
} from '@ionic-enterprise/intune';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  tokenInfo: any = null;
  user: IntuneMAMUser;
  cameraImg: string;
  user$: BehaviorSubject<IntuneMAMUser | null> = new BehaviorSubject(null);
  version: IntuneMAMVersionInfo | null = null;
  groupName: IntuneMAMGroupName | null = null;
  appConfig: IntuneMAMAppConfig | null = null;
  policy: IntuneMAMPolicy | null = null;

  constructor(private router: Router) { }

  ngOnInit() {
    this.user$.subscribe(async user => {
      console.log('User changed', user);
      this.user = user;
      if (user?.upn) {
        this.appConfig = await IntuneMAM.appConfig(user);
        this.groupName = await IntuneMAM.groupName(user);
        this.policy = await IntuneMAM.getPolicy(user);

        await this.getToken();
      }
    });
  }

  async ionViewDidEnter() {
    this.version = await IntuneMAM.sdkVersion();

    this.user$.next(await IntuneMAM.enrolledAccount());

    IntuneMAM.addListener('appConfigChange', () => {
      console.log('Policy change here');
    });

    IntuneMAM.addListener('policyChange', () => {
      console.log('Policy change here');
    });
  }

  async showConsole() {
    await IntuneMAM.displayDiagnosticConsole();
  }

  async getToken() {
    if (this.user$.value?.upn) {
      try {
        const tokenInfo = await IntuneMAM.acquireTokenSilent({
          scopes: ['https://graph.microsoft.com/.default'],
          ...this.user$.value,
        });
        this.tokenInfo = tokenInfo;
        console.log('Got token info', tokenInfo);
      } catch {
        console.error(
          'Unable to silently acquire token, getting interactive'
        );
        const tokenInfo = await IntuneMAM.acquireToken({
          scopes: ['https://graph.microsoft.com/.default'],
        });
        this.tokenInfo = tokenInfo;
      }
    }
  }

  async logout() {
    if (this.user$.value) {
      await IntuneMAM.deRegisterAndUnenrollAccount(this.user$.value);
    }
    this.router.navigate(['/']);
  }

  async enroll() {
    await IntuneMAM.registerAndEnrollAccount(this.user);
    const user = await IntuneMAM.enrolledAccount();
    alert('Enrolled ' + user.upn);
  }
  getTokenInfoJson() {
    return JSON.stringify((this.tokenInfo || {}), null, 2);
  }

  getPolicyJson() {
    return JSON.stringify((this.policy || {}), null, 2);
  }

  getAppConfigJson() {
    return JSON.stringify((this.appConfig || {}), null, 2);
  }

  async camera() {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.Uri
    });
    this.cameraImg = image.webPath;
  }
}
