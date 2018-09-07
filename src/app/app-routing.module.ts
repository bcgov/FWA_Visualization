import {AppComponent} from "./app.component";
import {LayoutComponent} from "./layout/layout.component";
import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {LayerComponent} from "revolsys-angular-leaflet";

const routes: Routes = [
  {path: '', component: LayoutComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
