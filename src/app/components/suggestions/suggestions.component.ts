import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FinanceService } from '../../services/finance.service';
import { Suggestion, SuggestionStatus } from '../../models/suggestion.model';

@Component({
    selector: 'app-suggestions',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './suggestions.component.html'
})
export class SuggestionsComponent {
    financeService = inject(FinanceService);

    // Form state
    newTitle = signal('');
    newDescription = signal('');

    // Edit state
    editingId = signal<string | null>(null);
    editTitle = signal('');
    editDescription = signal('');

    // Filter
    filterStatus = signal<'all' | SuggestionStatus>('all');

    filteredSuggestions = () => {
        const suggestions = this.financeService.suggestions();
        const filter = this.filterStatus();
        if (filter === 'all') return suggestions;
        return suggestions.filter(s => s.status === filter);
    };

    async addSuggestion() {
        const title = this.newTitle().trim();
        if (!title) return;

        try {
            await this.financeService.addSuggestion(title, this.newDescription().trim() || undefined);
            this.newTitle.set('');
            this.newDescription.set('');
        } catch (error) {
            console.error('Error adding suggestion:', error);
        }
    }

    startEditing(suggestion: Suggestion) {
        this.editingId.set(suggestion.id);
        this.editTitle.set(suggestion.title);
        this.editDescription.set(suggestion.description || '');
    }

    cancelEditing() {
        this.editingId.set(null);
        this.editTitle.set('');
        this.editDescription.set('');
    }

    async saveEdit(id: string) {
        const title = this.editTitle().trim();
        if (!title) return;

        try {
            await this.financeService.updateSuggestion(id, {
                title,
                description: this.editDescription().trim() || undefined
            });
            this.cancelEditing();
        } catch (error) {
            console.error('Error updating suggestion:', error);
        }
    }

    async toggleStatus(suggestion: Suggestion) {
        const newStatus: SuggestionStatus = suggestion.status === 'pendiente' ? 'comprado' : 'pendiente';
        try {
            await this.financeService.updateSuggestion(suggestion.id, { status: newStatus });
        } catch (error) {
            console.error('Error updating status:', error);
        }
    }

    async deleteSuggestion(id: string) {
        if (!confirm('¿Estás seguro de que deseas eliminar esta sugerencia?')) return;
        try {
            await this.financeService.deleteSuggestion(id);
        } catch (error) {
            console.error('Error deleting suggestion:', error);
        }
    }
}
