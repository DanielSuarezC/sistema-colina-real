import { Component, EventEmitter, Input, Output, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import 'flatpickr/dist/flatpickr.css';
import flatpickr from 'flatpickr';
import { Spanish } from 'flatpickr/dist/l10n/es';

@Component({
    selector: 'app-date-range-picker',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="relative">
        <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Rango de Fechas</label>
        <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
            </div>
            <input
                #dateInput
                type="text"
                class="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium"
                placeholder="Seleccionar rango..."
                readonly>
        </div>
    </div>
  `,
    styles: [`
    :host {
        display: block;
    }
  `]
})
export class DateRangePickerComponent implements AfterViewInit, OnDestroy {
    @ViewChild('dateInput') dateInput!: ElementRef<HTMLInputElement>;

    @Input() startDate: string = '';
    @Input() endDate: string = '';

    @Output() startDateChange = new EventEmitter<string>();
    @Output() endDateChange = new EventEmitter<string>();

    private fpInstance: flatpickr.Instance | undefined;

    ngAfterViewInit() {
        this.initFlatpickr();
    }

    ngOnDestroy() {
        if (this.fpInstance) {
            this.fpInstance.destroy();
        }
    }

    private initFlatpickr() {
        const defaultDate = (this.startDate && this.endDate)
            ? [this.startDate, this.endDate]
            : undefined;

        this.fpInstance = flatpickr(this.dateInput.nativeElement, {
            mode: 'range',
            locale: Spanish,
            dateFormat: 'Y-m-d',
            altInput: true,
            altFormat: 'j F, Y',
            defaultDate: defaultDate as any,
            // theme property removed
            onChange: (selectedDates, dateStr) => {
                if (selectedDates.length === 2) {
                    const start = this.formatDate(selectedDates[0]);
                    const end = this.formatDate(selectedDates[1]);

                    if (start !== this.startDate) {
                        this.startDate = start;
                        this.startDateChange.emit(start);
                    }
                    if (end !== this.endDate) {
                        this.endDate = end;
                        this.endDateChange.emit(end);
                    }
                }
            }
        });
    }

    private formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }
}
