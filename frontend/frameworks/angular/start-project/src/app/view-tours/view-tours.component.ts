import { Component } from '@angular/core';
import {NgForOf} from '@angular/common';

@Component({
  selector: 'app-view-tours',
  templateUrl: './view-tours.component.html',
  imports: [
    NgForOf
  ],
  styleUrls: ['./view-tours.component.css']
})
export class ViewToursComponent {
  tours = [
    { name: 'Тур в Париж', description: 'Путевка на 7 дней в Париж', price: 1000 },
    { name: 'Тур в Египет', description: 'Отдых на побережье Красного моря', price: 800 },
    { name: 'Тур в Японию', description: 'Путевка в Токио', price: 1500 },
  ];

  buyTour(tour: any) {
    console.log('Покупка тура:', tour);
    // В реальной ситуации можно перенаправить на страницу покупки
  }
}
