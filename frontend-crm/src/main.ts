import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEsMx from '@angular/common/locales/es-MX';
import { appConfig } from './app/app.config';
import { App } from './app/app';

registerLocaleData(localeEsMx);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
