import { Component } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './report.page.html',
  styleUrls: ['./report.page.scss'],
})
export class ReportPage {
  step: number = 1; // Tracks the current step (1: Photo, 2: Tags)
  photo: string | null = null; // Holds the photo data
  tags: string[] = []; // Holds the list of tags
  newTag: string = ''; // Holds the input for a new tag

  constructor(private http: HttpClient) {}

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

  sendReport() {
    const report = { photo: this.photo, tags: this.tags };

    this.http.post('https://your-server.com/api/reports', report).subscribe({
      next: response => {
        console.log('Report sent successfully!', response);
        this.resetForm(); // Reset the form after submission
      },
      error: err => {
        console.error('Error sending report:', err);
      },
    });
  }

  resetForm() {
    this.step = 1;
    this.photo = null;
    this.tags = [];
    this.newTag = '';
  }
}
