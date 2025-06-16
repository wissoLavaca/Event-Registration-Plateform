// filepath: src/types/jspdf-autotable.d.ts
import 'jspdf'; // This import is necessary to signal module augmentation
import { UserOptions } from 'jspdf-autotable'; // Import options type for better type safety

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: UserOptions) => jsPDF;
  }
}