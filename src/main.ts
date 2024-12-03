import { importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

import { getApp, initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideHttpClient(),
    provideRouter(routes, withPreloading(PreloadAllModules)), 
      provideFirebaseApp(() => 
        initializeApp({
          "projectId":"city-sentry",
          "appId":"1:913517777208:web:88ddea034d623525ddb1cd",
          "storageBucket":"city-sentry.firebasestorage.app",
          "apiKey":"AIzaSyAD3_ptLdz6PgkEC8ZtXLO82txLnASVbVU",
          "authDomain":"city-sentry.firebaseapp.com",
          "messagingSenderId":"913517777208",
          "measurementId":"G-WMN3L6RS3S"
        })
    ), 
    provideFirestore(() => getFirestore()),
  ],
});
