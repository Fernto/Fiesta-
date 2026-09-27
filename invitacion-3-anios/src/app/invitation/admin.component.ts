import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AttendanceRecord, AttendanceService } from './attendance.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  records: AttendanceRecord[] = [];

  constructor(private readonly attendanceService: AttendanceService) {}

  ngOnInit(): void {
    this.records = this.attendanceService.getAll();
  }

  get totalAttendees(): number {
    return this.records.reduce((total, record) => total + record.adults + record.children, 0);
  }

  exportRecords(): void {
    this.attendanceService.descargarCSV(this.records);
  }

  clearRecords(): void {
    if (!window.confirm('¿Quieres borrar todas las confirmaciones de este dispositivo?')) return;
    this.attendanceService.borrar();
    this.records = [];
  }
}