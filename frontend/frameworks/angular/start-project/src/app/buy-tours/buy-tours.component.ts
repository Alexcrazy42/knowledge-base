import { Component } from '@angular/core';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-buy-tours',
  templateUrl: './buy-tours.component.html',
  imports: [
    FormsModule
  ],
  styleUrls: ['./buy-tours.component.css']
})
export class BuyToursComponent {
  tourName = '';
  buyerName = '';
  buyerEmail = '';

  purchaseTour() {
    console.log('Тур куплен:', { tourName: this.tourName, buyerName: this.buyerName, buyerEmail: this.buyerEmail });
    // В реальном проекте отправить информацию о покупке на сервер
  }
}
