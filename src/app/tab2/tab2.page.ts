import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  IonicModule,
  LoadingController,
  ModalController,
} from '@ionic/angular';
import * as L from 'leaflet';
import 'leaflet.heat';
import { Geolocation } from '@capacitor/geolocation';
import { DateRangeModalComponent } from '../date-range-modal/date-range-modal.component';
import {
  collection,
  Firestore,
  getDocs,
  query,
  where,
} from '@angular/fire/firestore';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class Tab2Page implements OnInit {
  map: L.Map | undefined;
  heatLayer: any;
  reports: any[] = [];
  userLocation: { latitude: number; longitude: number } | null = null;
  selectedTagGroup = 'environmentalTags';
  selectedStartTime: string;
  selectedEndTime: string;

  tagGroups: { [key: string]: string[] } = {
    environmentalTags: [
      'Litter',
      'Illegal Dumping',
      'Air Pollution',
      'Water Pollution',
    ],
    infrastructureTags: [
      'Pothole',
      'Cracked Pavement',
      'Broken Streetlight',
      'Damaged Bench',
      'Blocked Drainage',
      'Abandoned Vehicle',
    ],
    safetyTags: [
      'Vandalism',
      'Unsafe Building',
      'Unsafe Bridge',
      'Broken Traffic Signals',
      'Open Manholes',
    ],
    aestheticTags: [
      'Overgrown Vegetation',
      'Graffiti',
      'Neglected Monuments',
      'Faded Paint',
    ],
    wildlifeTags: ['Dead Animals', 'Animal Menace'],
  };

  constructor(
    private firestore: Firestore,
    private loadingCtrl: LoadingController,
    private modalCtrl: ModalController
  ) {
    this.selectedStartTime = new Date(
      new Date().setHours(0, 0, 0, 0)
    ).toISOString();
    this.selectedEndTime = new Date(
      new Date().setHours(23, 59, 59, 999)
    ).toISOString();
  }

  async ngOnInit() {
    await this.loadMap();
    await this.getUserLocation();
    if (this.userLocation) {
      await this.fetchReportsNearUser();
    }
    this.filterReports();
  }

  async loadMap() {
    this.map = L.map('map');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(
      this.map
    );
  }

  async getUserLocation() {
    try {
      //const position = await Geolocation.getCurrentPosition();
      this.userLocation = {
        //latitude: position.coords.latitude,
        //longitude: position.coords.longitude,
        latitude: 43.724591,
        longitude: 10.38298,
      };
      console.log('User location:', this.userLocation);

      // Center the map on the user's location
      if (this.map)
        this.map.setView(
          [this.userLocation.latitude, this.userLocation.longitude],
          15
        );
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  }

  async fetchReportsNearUser() {
    const loading = await this.loadingCtrl.create({
      message: 'Loading reports...',
    });
    await loading.present();

    const RADIUS_IN_KM = 10; // Set the search radius (in kilometers)

    try {
      const reportsSnapshot = await getDocs(
        collection(this.firestore, 'reports')
      );
      const allReports = reportsSnapshot.docs.map((doc) => ({
        location: doc.data()['location'],
        tags: doc.data()['tags'],
        timestamp: doc.data()['timestamp']
          ? doc.data()['timestamp'].toDate()
          : null,
      }));

      // Filter reports within the specified radius
      this.reports = allReports.filter((report) => {
        if (report['location'] && this.userLocation) {
          const distance = this.calculateDistance(
            this.userLocation.latitude,
            this.userLocation.longitude,
            report['location'].latitude,
            report['location'].longitude
          );
          return distance <= RADIUS_IN_KM;
        }
        return false;
      });

      console.log('Nearby reports:', this.reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      await loading.dismiss();
    }
  }

  filterReports() {
    if (!this.map) return;

    // Get the valid tags for the selected group
    const validTags = this.tagGroups[this.selectedTagGroup];
    const startTime = new Date(this.selectedStartTime);
    const endTime = new Date(this.selectedEndTime);

    const filteredReports = this.reports.filter((report) => {
      const reportTags = report.tags || [];
      const reportTime = report.timestamp;
      // Check that the report's time is valid and falls between the selected start and end times.
      const inTimeRange =
        reportTime && reportTime >= startTime && reportTime <= endTime;
      // Check if the report has at least one tag from the selected tag group.
      const hasValidTag = reportTags.some((tag: string) =>
        validTags.includes(tag)
      );
      return inTimeRange && hasValidTag;
    });

    this.displayHeatmap(filteredReports);
  }

  async displayHeatmap(filteredReports: any[]) {
    if (this.map && this.reports.length > 0) {
      if (this.heatLayer) this.map.removeLayer(this.heatLayer);

      const heatmapData = filteredReports.map((report) => [
        report.location.latitude,
        report.location.longitude,
        0.5, // Intensity
      ]);

      this.heatLayer = (L as any)
        .heatLayer(heatmapData, {
          radius: 20,
          blur: 12,
          maxZoom: 15,
        })
        .addTo(this.map);
    }
  }

  async openDateRangeModal() {
    const modal = await this.modalCtrl.create({
      component: DateRangeModalComponent,
      componentProps: {
        startTime: this.selectedStartTime,
        endTime: this.selectedEndTime,
      },
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.selectedStartTime = result.data.startTime;
        this.selectedEndTime = result.data.endTime;
        // Re-run filtering logic after updating the time range.
        this.filterReports();
      }
    });

    return await modal.present();
  }

  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
