import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideImageEditorPlugins } from 'fluxio-image-editor';

import { routes } from './app.routes';
import { HostSavePlugin } from './host-save.plugin';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // FilePond-style host plugin via Angular DI (merged into every editor).
    provideImageEditorPlugins(HostSavePlugin),
  ],
};
