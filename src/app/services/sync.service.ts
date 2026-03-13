import { Injectable, signal, effect } from '@angular/core';

export interface PendingMutation {
  id: string; // generated uuid
  action: 'recordSale' | 'updateSale' | 'deleteSale' | 'recordRefacil' | 'deleteRefacil' | 'recordExpense' | 'updateExpense' | 'deleteExpense' | 'recordInvestment' | 'deleteInvestment' | 'transferBox' | 'closeLiquidation';
  payload: any;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  public isOnline = signal<boolean>(navigator.onLine);
  public pendingMutations = signal<PendingMutation[]>([]);

  private syncInProgress = false;

  constructor() {
    this.loadFromStorage();
    this.setupListeners();
  }

  private setupListeners() {
    window.addEventListener('online', () => {
      this.isOnline.set(true);
      // Let the consumer of SyncService trigger the actual sync
    });

    window.addEventListener('offline', () => {
      this.isOnline.set(false);
    });
  }

  private loadFromStorage() {
    const stored = localStorage.getItem('colina_real_offline_queue');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.pendingMutations.set(parsed);
      } catch (e) {
        console.error('Error loading offline queue', e);
        this.pendingMutations.set([]);
      }
    }
  }

  private saveToStorage(mutations: PendingMutation[]) {
    localStorage.setItem('colina_real_offline_queue', JSON.stringify(mutations));
  }

  public queueMutation(action: PendingMutation['action'], payload: any) {
    const newMutation: PendingMutation = {
      id: crypto.randomUUID(),
      action,
      payload,
      timestamp: Date.now()
    };
    
    this.pendingMutations.update(current => {
      const updated = [...current, newMutation];
      this.saveToStorage(updated);
      return updated;
    });
  }

  public removeMutation(id: string) {
    this.pendingMutations.update(current => {
      const updated = current.filter(m => m.id !== id);
      this.saveToStorage(updated);
      return updated;
    });
  }

  public clearQueue() {
    this.pendingMutations.set([]);
    localStorage.removeItem('colina_real_offline_queue');
  }
}
