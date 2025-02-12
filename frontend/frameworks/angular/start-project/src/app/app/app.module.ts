// app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { AppComponent } from '../app.component'; // Пример импорта

@NgModule({
  declarations: [
    // Компоненты
  ],
  imports: [
    BrowserModule,
    MatButtonModule // Добавление Angular Material модуля
  ],
  providers: [],
  // bootstrap: [AppComponent]
})
export class AppModule {}
