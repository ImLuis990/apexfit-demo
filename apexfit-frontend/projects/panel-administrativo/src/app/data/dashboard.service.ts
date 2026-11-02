import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from 'shared';
import { DashboardResumenDto } from './dtos';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  resumen(): Observable<DashboardResumenDto> {
    return this.http.get<DashboardResumenDto>(`${this.apiUrl}/dashboard/resumen`);
  }
}
