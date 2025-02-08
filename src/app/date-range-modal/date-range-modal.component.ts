import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-date-range-modal',
  templateUrl: './date-range-modal.component.html',
  styleUrls: ['./date-range-modal.component.scss'],
  standalone: true,
  imports: [FormsModule, IonicModule],
})
export class DateRangeModalComponent {
  @Input() startTime: string | undefined;
  @Input() endTime: string | undefined;

  constructor(private modalCtrl: ModalController) {}

  dismiss() {
    this.modalCtrl.dismiss();
  }

  apply() {
    // If the end date is earlier than the start date, assume user wants a single day.
    if (this.startTime === this.endTime && this.startTime) {
      this.endTime = new Date(new Date().setHours(23,59,59,999)).toISOString();
    }
    this.modalCtrl.dismiss({ startTime: this.startTime, endTime: this.endTime });
  }
}
