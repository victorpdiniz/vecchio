export type ProposedActionKind = 'none' | 'mark_bill_paid' | 'create_appointment' | 'create_medicine';

export interface ProposedActionMedicineSchedule {
  timeOfDay: string;
  daysOfWeek: number[];
}

// Formato serializado em ChatMessage.proposedAction (JSON). O agente só
// preenche isso — nunca chama billsService/agendaService/medicinesService
// diretamente — quem executa é chatService.confirmAction, depois do usuário
// confirmar.
export interface ProposedAction {
  kind: ProposedActionKind;
  billId?: string;
  appointmentTitle?: string;
  appointmentCategory?: string;
  appointmentStartAt?: string;
  appointmentIsAllDay?: boolean;
  appointmentAmount?: number;
  medicineName?: string;
  medicineDosage?: string;
  medicineNotes?: string;
  medicineProfileId?: string;
  medicineStartDate?: string;
  medicineEndDate?: string;
  medicineSchedules?: ProposedActionMedicineSchedule[];
  confirmationPrompt?: string;
}
