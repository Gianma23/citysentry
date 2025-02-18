import Map from 'ol/Map';
import View from 'ol/View';
import Heatmap from 'ol/layer/Heatmap';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { Icon, Style } from 'ol/style';
import { defaults as defaultControls } from 'ol/control';
import { Vector as VectorLayer } from 'ol/layer';

import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  IonicModule,
  LoadingController,
  ModalController,
} from '@ionic/angular';
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
export class Tab2Page implements OnInit, OnDestroy {
  map!: Map;
  heatmapLayer!: Heatmap;
  vectorSource = new VectorSource();
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
    this.initMap();
    await this.getUserLocation();
    if (this.userLocation) {
      await this.fetchReportsNearUser();
    }
    this.filterReports();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.setTarget(undefined);
    }
    console.log('Tab2Page destroyed');
  }

  initMap() {

    this.heatmapLayer = new Heatmap({
      source: this.vectorSource,
      blur: 15,
      radius: 10,
    });

    this.map = new Map({
      target: 'map1',
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        this.heatmapLayer,
      ],
      view: new View({
        center: fromLonLat([10.4, 43.7]), // Center the map on Pisa
        zoom: 13,
      }),
      controls: defaultControls({ attribution: false }),
    });
  }

  async getUserLocation() {
    try {
      const permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted') {
        await Geolocation.requestPermissions();
      }
      const position = await Geolocation.getCurrentPosition();
      this.userLocation = {
        /* latitude: position.coords.latitude,
        longitude: position.coords.longitude, */
        latitude: 43.724591, //TODO: Remove this hardcoded value
        longitude: 10.382981,
      };
      console.log('User location:', this.userLocation);

      // Center the map on the user's location
      if (this.map)
        this.map
          .getView()
          .setCenter(
            fromLonLat([
              this.userLocation.longitude,
              this.userLocation.latitude,
            ])
          );
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  }

  async fetchReportsNearUser() {
    const RADIUS_IN_KM = 10;
    const EARTH_RADIUS = 6371; // Earth's radius in km

    // Get user location
    if (!this.userLocation) {
      console.error('User location not available');
      return;
    }
    const userLat = this.userLocation.latitude;
    const userLon = this.userLocation.longitude;

    // Calculate latitude/longitude bounds for the bounding box
    const latDelta = (RADIUS_IN_KM / EARTH_RADIUS) * (180 / Math.PI);
    const lonDelta =
      (RADIUS_IN_KM / (EARTH_RADIUS * Math.cos((Math.PI * userLat) / 180))) *
      (180 / Math.PI);

    const minLat = userLat - latDelta;
    const maxLat = userLat + latDelta;
    const minLon = userLon - lonDelta;
    const maxLon = userLon + lonDelta;

    console.log(
      `Bounding box: (${minLat}, ${minLon}) to (${maxLat}, ${maxLon})`
    );

    // Query Firestore for reports within the bounding box
    const reportsRef = collection(this.firestore, 'reports');
    const q = query(
      reportsRef,
      where('location.latitude', '>=', minLat),
      where('location.latitude', '<=', maxLat),
      where('location.longitude', '>=', minLon),
      where('location.longitude', '<=', maxLon)
    );

    try {
      const querySnapshot = await getDocs(q);
      this.reports = querySnapshot.docs.map((doc) => ({
        location: doc.data()['location'],
        tags: doc.data()['tags'],
        timestamp: doc.data()['timestamp']
          ? doc.data()['timestamp'].toDate()
          : null,
      }));

      console.log('Reports within 10 km:', this.reports);
    } catch (error) {
      console.error('Error fetching nearby reports:', error);
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

  displayHeatmap(filteredReports: any[]) {
    // Clear existing features
    this.vectorSource.clear();

    // Add new features to the heatmap layer
    filteredReports.forEach((report) => {
      const { latitude, longitude } = report.location;
      const feature = new Feature({
        geometry: new Point(fromLonLat([longitude, latitude])),
      });

      // Add custom weight based on report data (if needed)
      feature.set('weight', 0.8); // Customize the weight (0-1) based on your criteria

      this.vectorSource.addFeature(feature);
    });

    console.log('Heatmap updated with filtered reports:', filteredReports);
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
