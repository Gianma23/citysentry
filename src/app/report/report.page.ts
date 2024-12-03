import { Component, OnInit } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { getApp } from '@angular/fire/app';
import { collection, Firestore } from '@angular/fire/firestore';
import { addDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './report.page.html',
  styleUrls: ['./report.page.scss'],
})
export class ReportPage implements OnInit {
  step: number = 1; // Tracks the current step (1: Photo, 2: Tags)
  photo: string | null = null; // Holds the photo data
  tags: string[] = []; // Holds the list of tags
  newTag: string = ''; // Holds the input for a new tag
  reportsCollection: any;

  constructor(private http: HttpClient,
    private firestore: Firestore
  ) {}

  ngOnInit() {
    this.reportsCollection = collection(this.firestore, 'reports'); 
  }

  async takePhoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (image?.dataUrl) {
        this.photo = image.dataUrl; // Save photo
        this.step = 2; // Move to the next step
      } else {
        console.error('Photo capture failed: No data URL returned');
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
    }
  }

  addTag() {
    if (this.newTag && !this.tags.includes(this.newTag.trim())) {
      this.tags.push(this.newTag.trim());
    }
    this.newTag = ''; // Clear the input
  }

  removeTag(tag: string) {
    this.tags = this.tags.filter(t => t !== tag);
  }

  async sendReport() {
    
    const report = { photo: this.photo, tags: this.tags };
    await addDoc(this.reportsCollection, report);
    this.resetForm();
    console.log('Report sent:', report);
  }

  resetForm() {
    this.step = 1;
    this.photo = null;
    this.tags = [];
    this.newTag = '';
  }
}
