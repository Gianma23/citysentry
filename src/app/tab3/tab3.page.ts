import Map from 'ol/Map';
import View from 'ol/View';
import Heatmap from 'ol/layer/Heatmap';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';

import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  IonicModule,
  LoadingController,
  ModalController,
} from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import {
  collection,
  Firestore,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from '@angular/fire/firestore';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class Tab3Page implements AfterViewInit {
  map!: Map;
  heatmapLayer!: Heatmap;
  vectorSource = new VectorSource();
  heatLayer: any;
  reports: any[] = [];
  userLocation: { latitude: number; longitude: number } | null = null;
  selectedTagGroup = 'environmental';

  constructor(
    private firestore: Firestore,
    private loadingCtrl: LoadingController,
    private modalCtrl: ModalController
  ) {}

  async ngAfterViewInit() {
    this.initMap();
    await this.getUserLocation();
    if (this.userLocation) {
      await this.fetchPredictionsNearUser();
    }
    this.filterReports();
  }

  initMap() {
    this.heatmapLayer = new Heatmap({
      source: this.vectorSource,
      blur: 15,
      radius: 15,
    });

    this.map = new Map({
      target: 'map',
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

  async fetchPredictionsNearUser() {
    const RADIUS_IN_KM = 15;
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
    try {
      const reportsRef = collection(this.firestore, 'predictions');
      const q = query(
        reportsRef,
        where('latitude', '>=', minLat),
        where('latitude', '<=', maxLat),
        where('longitude', '>=', minLon),
        where('longitude', '<=', maxLon),
        orderBy('pred_date', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      let mostRecentDate = null;

      if (!querySnapshot.empty) {
        mostRecentDate = querySnapshot.docs[0].data()['pred_date'];
        console.log('Most recent pred_date:', mostRecentDate);
      }

      if (mostRecentDate) {
        const q2 = query(
          reportsRef,
          where('latitude', '>=', minLat),
          where('latitude', '<=', maxLat),
          where('longitude', '>=', minLon),
          where('longitude', '<=', maxLon),
          where('pred_date', '==', mostRecentDate)
        );

        const querySnapshot2 = await getDocs(q2);
        this.reports = querySnapshot2.docs.map((doc) => ({
          latitude: doc.data()['latitude'],
          longitude: doc.data()['longitude'],
          group: doc.data()['group'],
        }));
      }

      console.log('Reports within 10 km:', this.reports);
    } catch (error) {
      console.error('Error fetching nearby reports:', error);
    }
  }

  filterReports() {
    if (!this.map) return;

    const filteredReports = this.reports.filter((report) => {
      console.log('Report group:', report.group);
      console.log('Selected tag group:', this.selectedTagGroup);
      return report.group === this.selectedTagGroup;
    });

    this.displayHeatmap(filteredReports);
  }

  displayHeatmap(filteredReports: any[]) {
    // Clear existing features
    this.vectorSource.clear();

    // Add new features to the heatmap layer
    filteredReports.forEach((report) => {
      const latitude = report.latitude;
      const longitude = report.longitude;
      const feature = new Feature({
        geometry: new Point(fromLonLat([longitude, latitude])),
      });

      // Add custom weight based on report data (if needed)
      feature.set('weight', 0.9); // Customize the weight (0-1) based on your criteria

      this.vectorSource.addFeature(feature);
    });

    console.log('Heatmap updated with filtered reports:', filteredReports);
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
