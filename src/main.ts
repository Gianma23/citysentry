import { environment } from './environments/environment';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import {
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

import { getApp, initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { initializeFirestore, provideFirestore, disableNetwork, clearIndexedDbPersistence } from '@angular/fire/firestore';  // Use initializeFirestore instead of getFirestore

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideHttpClient(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideFirebaseApp(() => initializeApp({ ...environment.firebaseConfig })),
    provideFirestore(() => {
      const firestore = initializeFirestore(getApp(), { cacheSizeBytes: 1048576 });
      clearIndexedDbPersistence(firestore).catch((err) => {
        console.error('Failed to clear persistence:', err);
      });
      return firestore;
    }),
  ],
});
