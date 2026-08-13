import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideMockDataAccess } from './core/data-access/mock-crm-data';
import { OperationalDataService } from './core/data-access/services/operational-data.service';
import { DataInitializerService } from './core/data-access/services/data-initializer.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    ...provideMockDataAccess(),
    // Data Access Layer services
    OperationalDataService,
    DataInitializerService,
  ],
};
