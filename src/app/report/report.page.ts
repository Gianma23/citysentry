import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { serverTimestamp } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { collection, Firestore, addDoc } from '@angular/fire/firestore';
import { ToastController } from '@ionic/angular';
import { Platform } from '@ionic/angular';

import {
  IonHeader,
  IonContent,
  IonToolbar,
  IonTitle,
  IonButton,
  IonLabel,
  IonChip,
  IonIcon,
  IonLoading, IonToast, IonFooter } from '@ionic/angular/standalone';
import { checkmarkCircle } from 'ionicons/icons';
import { addIcons } from 'ionicons';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [IonFooter, IonToast, 
    IonLoading,
    IonIcon,
    IonChip,
    IonLabel,
    IonButton,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
  ],
  templateUrl: './report.page.html',
  styleUrls: ['./report.page.scss'],
})
export class ReportPage {
  step: number = 1; // Tracks the current step (1: Photo, 2: Tags)
  photo: string | undefined; // Holds the photo data
  tags: string[] = []; // Holds the list of tags
  newTag: string = ''; // Holds the input for a new tag
  reportsCollection: any;
  coordinates: { latitude: number; longitude: number } | null = null;
  @ViewChild('reportLoading') loading: any;
  environmentalTags = [
    'Litter',
    'Illegal Dumping',
    'Air Pollution',
    'Water Pollution',
  ];
  infrastructureTags = [
    'Pothole',
    'Cracked Pavement',
    'Broken Streetlight',
    'Damaged Bench',
    'Blocked Drainage',
    'Abandoned Vehicle',
  ];
  safetyTags = [
    'Vandalism',
    'Unsafe Building',
    'Unsafe Bridge',
    'Broken Traffic Signals',
    'Open Manholes',
  ];
  aestheticTags = [
    'Overgrown Vegetation',
    'Graffiti',
    'Neglected Monuments',
    'Faded Paint',
  ];
  wildlifeTags = ['Dead Animals', 'Animal Menace'];

  constructor(
    private firestore: Firestore,
    private toastController: ToastController,
    private platform: Platform
  ) {
    addIcons({ checkmarkCircle });
  }

  async takePhoto() {
    if (this.platform.is('hybrid')) {
      const cameraPermission = await Camera.requestPermissions({
        permissions: ['camera'],
      });
      if (cameraPermission.camera !== 'granted') {
        this.loading.dismiss();
        return;
      }
    }
    try {
      const image = await Camera.getPhoto({
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        width: 1024,
        height: 1024,
        saveToGallery: false,
        allowEditing: false,
        quality: 30,
      });

      if (image) {
        this.photo = image.base64String;
        console.log('Photo captured:', this.photo);
        this.step = 2;
        await this.getLocation();
      } else {
        console.error('Photo capture failed: No data URL returned');
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
    }
  }

  async getLocation() {
    if (this.platform.is('hybrid')) {
      const permissionStatus = await Geolocation.requestPermissions({
        permissions: ['location'],
      });
      if (permissionStatus.location !== 'granted') {
        await this.loading.dismiss();
        return;
      }
    }

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
    });
    if (position) {
      this.coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      console.log('Location captured:', this.coordinates);
    } else {
      await this.loading.dismiss();
      await this.showToast(
        'Location is not available. Please ensure location services are enabled.',
        'warning'
      );
      this.coordinates = null;
      return;
    }
  }

  toggleTag(tag: string) {
    if (this.tags.includes(tag)) {
      this.tags = this.tags.filter((t) => t !== tag);
    } else {
      this.tags.push(tag); // Add if not selected
    }
  }

  async sendReport() {
    if(this.coordinates === null) {
      return await this.showToast('Location is being calculated, please retry.', 'warning');
    }

    const report = {
      photo: this.photo,
      tags: this.tags,
      location: this.coordinates,
      timestamp: serverTimestamp(),
    };
    
    try {
      await this.loading.present();
      await addDoc(collection(this.firestore, 'reports'), report);
      this.step = 3;
      console.log('Report sent successfully:', report);
    } catch (error) {
      console.error('Failed to send report:', error);
      if (error instanceof Error) {
        await this.loading.dismiss();
        await this.showToast(error.message, 'danger');
      }
    } finally {
      await this.loading.dismiss();
    }
  }

  async showToast(message: string, color: string) {
    try {
      const toast = await this.toastController.create({
        message,
        duration: 3000,
        color,
        position: 'bottom',
      });
      await toast.present();
    } catch (error) {
      console.error('Failed to present toast:', error);
    }
  }

  resetForm() {
    this.step = 1;
    this.photo = undefined;
    this.tags = [];
    this.newTag = '';
    this.coordinates = null;
  }
}
