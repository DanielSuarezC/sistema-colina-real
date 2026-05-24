import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';

interface PublicSuggestion {
    id: string;
    title: string;
    description?: string;
    status: string;
    created_at: string;
}

@Component({
    selector: 'app-public-suggestions',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './public-suggestions.component.html'
})
export class PublicSuggestionsComponent implements OnInit {
    private supabase = inject(SupabaseService);

    suggestions = signal<PublicSuggestion[]>([]);
    activeTab = signal<'pendiente' | 'atendida'>('pendiente');
    newTitle = signal('');
    newDescription = signal('');
    loading = signal(true);
    submitting = signal(false);
    submitted = signal(false);
    errorMsg = signal<string | null>(null);

    pending = computed(() => this.suggestions().filter(s => s.status === 'pendiente'));
    attended = computed(() => this.suggestions().filter(s => s.status !== 'pendiente'));

    ngOnInit() {
        this.loadSuggestions();
    }

    async loadSuggestions() {
        this.loading.set(true);
        this.errorMsg.set(null);
        try {
            const { data, error } = await this.supabase
                .from('suggestions')
                .select('id, title, description, status, created_at')
                .order('created_at', { ascending: false });
            if (error) throw error;
            this.suggestions.set(data || []);
        } catch {
            this.errorMsg.set('No se pudieron cargar las sugerencias. Intenta más tarde.');
        } finally {
            this.loading.set(false);
        }
    }

    async addSuggestion() {
        const title = this.newTitle().trim();
        if (!title) return;

        this.submitting.set(true);
        this.errorMsg.set(null);
        try {
            const { error } = await this.supabase
                .from('suggestions')
                .insert({ title, description: this.newDescription().trim() || null, status: 'pendiente' });
            if (error) throw error;
            this.newTitle.set('');
            this.newDescription.set('');
            this.submitted.set(true);
            await this.loadSuggestions();
            setTimeout(() => this.submitted.set(false), 4000);
        } catch {
            this.errorMsg.set('No se pudo enviar la sugerencia. Intenta de nuevo.');
        } finally {
            this.submitting.set(false);
        }
    }
}
