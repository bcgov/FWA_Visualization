import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';

@Injectable()
export class RiverService {
  highlightedRiver: any;

  private _selectedRiver: string;

  public selectedRiverChange: Subject<string> = new Subject<string>();

  constructor() {
  }

  public get selectedRiver(): string {
    return this._selectedRiver;
  }

  public set selectedRiver(selectedRiver: string) {
    this._selectedRiver = selectedRiver;
    this.selectedRiverChange.next(selectedRiver);
  }

}
