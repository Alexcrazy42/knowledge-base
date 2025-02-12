import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UploadToursComponent } from './upload-tours/upload-tours.component';
import { ViewToursComponent } from './view-tours/view-tours.component';
import { BuyToursComponent } from './buy-tours/buy-tours.component';

export const routes: Routes = [
  { path: 'upload', component: UploadToursComponent },
  { path: 'view', component: ViewToursComponent },
  { path: 'buy', component: BuyToursComponent },
  { path: '', redirectTo: '/view', pathMatch: 'full' },  // Перенаправление на страницу просмотра туров по умолчанию
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
