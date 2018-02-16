import {Config} from "./Config";
import {RiverService} from "./river.service";
import {HttpClient} from "@angular/common/http";
import {Injectable} from '@angular/core';

@Injectable()
export class GnisNameService {

  nameById: {[id: number]: string};

  records = [];

  constructor(
    private http: HttpClient
  ) {
    this.http.get(`${Config.baseUrl}/GNIS_NAMES.tsv`, {
      responseType: 'text'
    }).subscribe(text => {
      this.nameById = {};
      let first = true;
      for (const line of text.split('\n')) {
        if (first) {
          first = false;
        } else if (line) {
          const fields = line.split('\t');
          const properties = {};
          let fieldIndex = 0;
          const id = parseInt(fields[0]);
          const name = fields[1];
          this.nameById[id] = name;
        }
      }
      const records = this.records;
      this.records = [];
      for (const record of records) {
        this.setName(record)
      }
    });
  }

  setName(record: any) {
    if (this.nameById) {
      const id = record['GNIS_ID'];
      if (id) {
        const name = this.nameById[id];
        if (name) {
          record['GNIS_NAME'] = name;
        }
      }
    } else {
      this.records.push(record);
    }
  }
}
