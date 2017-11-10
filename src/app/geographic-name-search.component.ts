import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild
} from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import {
  MapService,
  SearchResult,
  SearchZoomComponent
} from 'revolsys-angular-leaflet';

@Component({
  selector: 'app-geographic-name-search',
  template: `<leaflet-search-zoom label="Geographic Name" style="width: 300px; display: flex"></leaflet-search-zoom>`
})
export class GeographicNameSearchComponent implements AfterViewInit {
  @ViewChild(SearchZoomComponent)
  searchComponent: SearchZoomComponent;


  public query: string;

  public constructor(
    private http: HttpClient
  ) {
  }

  ngAfterViewInit() {
    if (this.searchComponent) {
      this.searchComponent.searchFunction = (query) => this.search(query);
    }
  }

  search(query): Promise<SearchResult[]> {
    const params = new HttpParams() //
      .set('name', query) //
      .set('minScore', '0.7') //
      .set('itemsPerPage', '10') //
      .set('outputSRS', '4326') //
      .set('embed', '0') //
      .set('outputStyle', 'detail') //
      .set('outputFormat', 'jsonx') //
      .set('callback', 'JSONP_CALLBACK') //
      .toString();
    return this.http.jsonp(
      `https://apps.gov.bc.ca/pub/bcgnws/names/soundlike?${params}`,
      'jsonp12345'
    ).toPromise().then(data => {
      const matches: SearchResult[] = [];
      const found = false;
      const features = data['features'];
      if (features) {
        for (const feature of features) {
          const props = feature.properties;
          const name = props.name;
          let label = name;
          let featureType = props.featureType;
          if (featureType) {
            const parenStartIndex = featureType.indexOf('(');
            const parenEndIndex = featureType.indexOf(')');
            if (parenStartIndex !== -1 && parenEndIndex > parenStartIndex) {
              featureType = featureType.substring(0, parenStartIndex) + featureType.substring(parenEndIndex + 1);
            }
            label += ' (' + featureType + ')';
          }
          label += '  ' + props.feature.relativeLocation;
          matches.push(new SearchResult(
            props['uri'],
            label,
            props['featurePoint']
          ));
        }
      }
      return matches;
    });
  }
}
