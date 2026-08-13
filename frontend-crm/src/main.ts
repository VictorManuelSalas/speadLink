import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEsMx from '@angular/common/locales/es-MX';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { DataInitializerService } from './app/core/data-access/services/data-initializer.service';

registerLocaleData(localeEsMx);

bootstrapApplication(App, appConfig)
  .then((appRef) => {
    // Initialize operational data after app bootstrap
    const dataInitializer = appRef.injector.get(DataInitializerService);
    return dataInitializer.initializeOperationalData();
  })
  .catch((err) => console.error('Failed to initialize application:', err));
