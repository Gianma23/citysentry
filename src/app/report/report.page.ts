import { Component, OnInit } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { serverTimestamp } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { collection, Firestore, addDoc } from '@angular/fire/firestore';
import { HttpClient } from '@angular/common/http';
import {
  IonHeader,
  IonContent,
  IonToolbar,
  IonTitle,
  IonButton,
  IonItem,
  IonList, IonInput, IonLabel, IonChip, IonIcon, IonCheckbox } from '@ionic/angular/standalone';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [IonCheckbox, IonIcon, IonChip, IonLabel, IonInput, 
    IonList,
    IonItem,
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
export class ReportPage implements OnInit {
  step: number = 1; // Tracks the current step (1: Photo, 2: Tags)
  photo: string | null = null; // Holds the photo data
  tags: string[] = []; // Holds the list of tags
  newTag: string = ''; // Holds the input for a new tag
  reportsCollection: any;
  coordinates: { latitude: number; longitude: number } | null = null;
  environmentalTags = ['Litter', 'Graffiti', 'Illegal Dumping', 'Air Pollution', 'Water Pollution'];
  infrastructureTags = ['Potholes', 'Cracked Pavements', 'Broken Streetlights', 'Damaged Benches', 'Unmaintained Parks', 'Blocked Drains', 'Abandoned Vehicles'];
  safetyTags = ['Vandalism', 'Broken Fences', 'Unsafe Buildings', 'Broken Traffic Signals', 'Open Manholes'];
  aestheticTags = ['Overgrown Vegetation', 'Neglected Monuments', 'Faded Paint', 'Dirty Public Transport'];
  illegalTags = ['Unauthorized Posters/Flyers', 'Encroachments'];
  wildlifeTags = ['Dead Animals', 'Animal Menace'];

  constructor(private httpClient: HttpClient, private firestore: Firestore) {}

  async ngOnInit() {
    //await this.requestPermission();
    this.reportsCollection = collection(this.firestore, 'reports');
  }

  async takePhoto() {
    try {
      const image = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        allowEditing: false,
        quality: 90,
      });

      if (image?.dataUrl) {
        this.photo = image.dataUrl; // Save photo
        this.step = 2; // Move to the next step
        await this.getLocation();
      } else {
        console.error('Photo capture failed: No data URL returned');
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
    }
  }

  async requestPermission(): Promise<boolean> {
    const permissionStatus = await Camera.requestPermissions();

    if (permissionStatus.camera === 'granted') {
      return true;
    } else {
      alert('Camera permission is required. Please enable it in settings.');
      return false;
    }
  }

  async getLocation() {
    try {
      const position = await Geolocation.getCurrentPosition();
      this.coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      console.log('Location captured:', this.coordinates);
    } catch (error) {
      console.error('Error getting location:', error);
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
    const report = {
      photo: this.photo,
      tags: this.tags,
      location: this.coordinates,
      timestamp: serverTimestamp(),
    };
    await addDoc(this.reportsCollection, report);
    this.resetForm();
    console.log('Report sent:', report);
  }

  resetForm() {
    this.step = 1;
    this.photo = null;
    this.tags = [];
    this.newTag = '';
    this.coordinates = null;
  }
}
