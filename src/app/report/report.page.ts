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
  IonLoading,
} from '@ionic/angular/standalone';
import { checkmarkCircle } from 'ionicons/icons';
import { addIcons } from 'ionicons';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [
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
    'Graffiti',
    'Illegal Dumping',
    'Air Pollution',
    'Water Pollution',
  ];
  infrastructureTags = [
    'Pothole',
    'Cracked Pavement',
    'Broken Streetlight',
    'Damaged Bench',
    'Unmaintained Bridge',
    'Blocked Drainage',
    'Abandoned Vehicle',
  ];
  safetyTags = [
    'Vandalism',
    'Unsafe Building',
    'Broken Traffic Signals',
    'Open Manholes',
  ];
  aestheticTags = [
    'Overgrown Vegetation',
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
        saveToGallery: false,
        allowEditing: false,
        quality: 30,
      });

      if (image) {
        this.photo = image.base64String;
        console.log('Photo captured:', this.photo);
        this.step = 2;
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
        this.loading.dismiss();
        return;
      }
    }

    const position = await Geolocation.getCurrentPosition();
    if (position) {
      this.coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      console.log('Location captured:', this.coordinates);
    } else {
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
    await this.getLocation();
    console.log(this.coordinates);
    if (!this.coordinates) {
      await this.loading.dismiss();
      await this.showToast(
        'Location is not available. Please ensure location services are enabled.',
        'warning'
      );
      return;
    }

    const report = {
      photo: this.photo,
      tags: this.tags,
      location: this.coordinates,
      timestamp: serverTimestamp(),
    };

    try {
      await addDoc(collection(this.firestore, 'reports'), report);
      this.step = 3;
      console.log('Report sent successfully:', report);
    } catch (error) {
      console.error('Failed to send report:', error);
      if (error instanceof Error) {
        await this.showToast(error.message, 'danger');
      }
    } finally {
      await this.loading.dismiss();
    }
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000, // Toast is displayed for 3 seconds
      color,
      position: 'bottom', // Position can be 'top', 'middle', or 'bottom'
    });
    await toast.present();
  }

  resetForm() {
    this.step = 1;
    this.photo = undefined;
    this.tags = [];
    this.newTag = '';
    this.coordinates = null;
  }
}
