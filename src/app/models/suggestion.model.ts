export type SuggestionStatus = 'pendiente' | 'comprado';

export interface Suggestion {
    id: string;
    title: string;
    description?: string;
    status: SuggestionStatus;
    created_at: Date;
    updated_at: Date;
}
