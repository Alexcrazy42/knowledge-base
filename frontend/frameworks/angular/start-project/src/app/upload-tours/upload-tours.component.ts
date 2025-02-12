import { Component } from '@angular/core';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-upload-tours',
  templateUrl: './upload-tours.component.html',
  imports: [
    FormsModule
  ],
  styleUrls: ['./upload-tours.component.css']
})
export class UploadToursComponent {
  tour = { name: '', description: '', price: 0 };

  uploadTour() {
    console.log('Tour uploaded:', this.tour);
  }
}
