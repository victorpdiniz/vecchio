export type ProposedActionKind = 'none' | 'mark_bill_paid' | 'create_appointment';

// Formato serializado em ChatMessage.proposedAction (JSON). O agente só
// preenche isso — nunca chama billsService/agendaService diretamente — quem
// executa é chatService.confirmAction, depois do usuário confirmar.
export interface ProposedAction {
  kind: ProposedActionKind;
  billId?: string;
  appointmentTitle?: string;
  appointmentCategory?: string;
  appointmentStartAt?: string;
  appointmentIsAllDay?: boolean;
  appointmentAmount?: number;
  confirmationPrompt?: string;
}
