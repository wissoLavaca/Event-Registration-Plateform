import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import './EventInscriptionsPage.css';
import InscriptionDetailModal from './InscriptionDetailModal';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf'; 
import { CellHookData, type UserOptions } from 'jspdf-autotable';



interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions | any) => jsPDFWithAutoTable;
}

interface Departement {
  id_departement: number;
  name_departement: string;
}

interface User {
  id_user: number;
  username: string;
  first_name: string;
  last_name: string;
  departement: Departement | null;
}
interface FormField {
  id_field: number;
  label: string;
}
interface FieldResponse {
  id_field_response: number;
  response_text: string | null;
  response_file_path: string | null;
  formField: FormField | null;
}
interface Inscription {
  id_inscription: number;
  user: User;
  fieldResponses: FieldResponse[];
  created_at: string;
}

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any /* or UserOptions */) => jsPDFWithAutoTable; 
}

const EventInscriptionsPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [eventTitle, setEventTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInscription, setSelectedInscription] = useState<Inscription | null>(null);

 
  const [searchTerm, setSearchTerm] = useState<string>(''); 
  const [selectedDepartment, setSelectedDepartment] = useState<string>(''); 
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [filteredInscriptions, setFilteredInscriptions] = useState<Inscription[]>([]);
  const [uniqueDepartments, setUniqueDepartments] = useState<string[]>([]);
  


  useEffect(() => {
    const fetchInscriptions = async () => {
      
      if (!eventId) return;
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');

      try {
        const eventRes = await fetch(`http://localhost:3001/api/events/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (eventRes.ok) {
          const eventData = await eventRes.json();
          setEventTitle(eventData.title_event || `Événement ID: ${eventId}`);
        } else {
          setEventTitle(`Événement ID: ${eventId}`);
        }

        const inscriptionsRes = await fetch(`http://localhost:3001/api/events/${eventId}/inscriptions`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!inscriptionsRes.ok) {
          if (inscriptionsRes.status === 403) {
             throw new Error('Accès refusé.');
          }
          const errorData = await inscriptionsRes.json();
          throw new Error(errorData.message || `Failed to fetch inscriptions (status: ${inscriptionsRes.status})`);
        }
        const data: Inscription[] = await inscriptionsRes.json();
        setInscriptions(data);
        setFilteredInscriptions(data); 

        const departments = new Set<string>();
        data.forEach(inscription => {
          if (inscription.user?.departement?.name_departement) {
            departments.add(inscription.user.departement.name_departement);
          }
        });
        setUniqueDepartments(Array.from(departments).sort());
      } catch (err: any) {
        console.error("Error fetching inscriptions:", err);
        setError(err.message || 'Une erreur est survenue.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchInscriptions();
  }, [eventId]);

  useEffect(() => {
    let currentInscriptions = [...inscriptions];

    if (searchTerm) {
      currentInscriptions = currentInscriptions.filter(inscription =>
        (inscription.user?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         inscription.user?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedDepartment) {
      currentInscriptions = currentInscriptions.filter(inscription =>
        inscription.user?.departement?.name_departement === selectedDepartment
      );
    }

    if (selectedDate) {
      currentInscriptions = currentInscriptions.filter(inscription => {
        const inscriptionDate = new Date(inscription.created_at).toISOString().split('T')[0];
        return inscriptionDate === selectedDate;
      });
    }

    setFilteredInscriptions(currentInscriptions);
  }, [searchTerm, selectedDepartment, selectedDate, inscriptions]);

  const handleOpenModal = (inscription: Inscription) => {
     console.log("Opening modal for inscription:", JSON.stringify(inscription, null, 2)); // Add this line
    setSelectedInscription(inscription);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedInscription(null);
  };

  // --- NEW HANDLERS FOR FILTER INPUTS ---
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleDepartmentChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDepartment(event.target.value);
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('');
    setSelectedDate('');
  };


  const getFormattedFileName = (baseName: string) => {
    const date = new Date();
    const dateString = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    const eventNameSlug = eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() || `event_${eventId}`;
    return `${eventNameSlug}_${baseName}_${dateString}`;
  };
  
  const getExportData = () => {

    const dataToExport = filteredInscriptions;

    const allFieldLabels = new Set<string>();
    dataToExport.forEach(inscription => {
      inscription.fieldResponses.forEach(fr => {
        if (fr.formField?.label) {
          allFieldLabels.add(fr.formField.label);
        }
      });
    });
    const sortedFieldLabels = Array.from(allFieldLabels).sort();

    const headers = [
      "Prénom", "Nom", "Département", "Soumis le",
      ...sortedFieldLabels
    ];

    const rows = dataToExport.map(inscription => {
      const row: (string | number | null)[] = [
        inscription.user?.first_name || 'N/A',
        inscription.user?.last_name || 'N/A',
        inscription.user?.departement?.name_departement || 'N/A',
        new Date(inscription.created_at).toLocaleDateString(),
      ];
      sortedFieldLabels.forEach(label => {
        const response = inscription.fieldResponses.find(fr => fr.formField?.label === label);
        if (response) {
          if (response.response_text) {
            row.push(response.response_text);
          } else if (response.response_file_path) {
            let pathValue = response.response_file_path;
            if (pathValue.toLowerCase().startsWith("fichier:")) {
              pathValue = pathValue.substring(pathValue.indexOf(':') + 1).trim();
            }
            
            const actualFileName = pathValue.split(/[\\/]/).pop() || pathValue;
            
            const fileUrl = `http://localhost:3001/uploads/${actualFileName.trim()}`; 
            row.push(fileUrl);
          } else {
            row.push('');
          }
        } else {
          row.push('');
        }
      });
      return row;
    });
    return { headers, rows, dataToExport };
  };


  const handleExportCSV = async () => {
    const { headers, rows } = getExportData();

    const csvRows = rows.map(row => {
      return row.map(cell => {
        if (typeof cell === 'string' && cell.startsWith('http://localhost:3001/uploads/')) {
          const fullUrl = cell;
          const fileName = cell.split('/').pop() || 'file'; 

          const escapedUrl = fullUrl.replace(/"/g, '""');
          const escapedFileName = fileName.replace(/"/g, '""');
          
          return `=LIEN_HYPERTEXTE("${escapedUrl}","${escapedFileName}")`; 
        }
        return cell;
      });
    });

    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.map(cell => {
        const cellString = String(cell || '');

        if (cellString.startsWith('=')) {
          return `"${cellString.replace(/"/g, '""')}"`; 
        }
        return `"${cellString.replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');

    const BOM = "\uFEFF"; 
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    triggerDownload(blob, `${getFormattedFileName("inscriptions")}.csv`);
  };

  const handleExportExcel = async () => {
    const { headers, rows: dataRows } = getExportData(); 

    const excelRows = dataRows.map(row => {
      return row.map(cell => {
        if (typeof cell === 'string' && cell.startsWith('http://localhost:3001/uploads/')) {
          const fileName = cell.split('/').pop() || 'Lien vers le fichier';
          return { v: fileName, l: { Target: cell, Tooltip: `Ouvrir ${fileName}` } };
        }
        return cell; 
      });
    });
    
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...excelRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inscriptions");
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });

    triggerDownload(blob, `${getFormattedFileName("inscriptions")}.xlsx`);
  };

  const handleExportPDF = async () => {
    console.log("handleExportPDF: PDF export initiated.");
    const { headers, rows } = getExportData();
    console.log("handleExportPDF: Export data - Headers:", headers);
    console.log("handleExportPDF: Export data - Rows count:", rows.length);
    if (rows.length === 0) {
      console.warn("handleExportPDF: No data to export to PDF.");
      alert("Aucune donnée à exporter en PDF.");
      return;
    }

    const doc = new jsPDF() as jsPDFWithAutoTable; 
    
    doc.text(`Inscriptions pour: ${eventTitle}`, 14, 15);
    doc.autoTable({ 
      head: [headers],
      body: rows.map(row => row.map(cell => {
        const cellString = String(cell || '');
        if (cellString.startsWith('http://localhost:3001/uploads/')) {
          return cellString.split('/').pop() || '';
        }
        return cellString;
      })),
      startY: 25,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 160, 133] },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      didParseCell: (data: CellHookData) => {
        const originalCellData = rows[data.row.index]?.[data.column.index];
        if (typeof originalCellData === 'string' && originalCellData.startsWith('http://localhost:3001/uploads/')) {
          data.cell.styles.textColor = [0, 0, 255];
        }
      },
      didDrawCell: (data: CellHookData) => {
        const originalCellData = rows[data.row.index]?.[data.column.index];
        if (typeof originalCellData === 'string' && originalCellData.startsWith('http://localhost:3001/uploads/')) {
          doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: originalCellData });
          
          const text = Array.isArray(data.cell.text) ? data.cell.text[0] : '';
          const textWidth = doc.getTextWidth(text);
          const textPos = data.cell.getTextPos(); 
          doc.setDrawColor(0, 0, 255); 
          doc.line(textPos.x, textPos.y + 3, textPos.x + textWidth, textPos.y + 3);
        }
      },
    });

    const pdfBlob = doc.output('blob');
    console.log("handleExportPDF: PDF blob generated.");

    triggerDownload(pdfBlob, `${getFormattedFileName("inscriptions")}.pdf`);
  };

  const triggerDownload = (blob: Blob, fileName: string) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };


  if (isLoading) {
    return <div className="loading-message">Chargement des inscriptions...</div>;
  }
  if (error) {
    return <div className="error-message">Erreur: {error}</div>;
  }

  return (
    <div className="event-inscriptions-page">

      <Link to="/forms" className="back-link icon-link"> 
        <i className="fi fi-rr-arrow-left"></i> 
        Retour à la gestion des événements
      </Link>
      <h2>Inscriptions pour: {eventTitle}</h2>

      <div className="filters-container">
        <input
          type="text"
          placeholder="Rechercher par nom..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="filter-input"
        />
        <select
          value={selectedDepartment}
          onChange={handleDepartmentChange}
          className="filter-select"
        >
          <option value="">Tous les départements</option>
          {uniqueDepartments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
        <input
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          className="filter-input"
        />
        <button onClick={clearFilters} className="clear-filters-btn">Réinitialiser les filtres</button>
      </div>

      <div className="export-options-container">
        <div className="export-buttons">
          <button onClick={handleExportCSV} className="export-btn csv-btn">Exporter en CSV</button>
          <button onClick={handleExportExcel} className="export-btn excel-btn">Exporter en Excel</button>
          <button onClick={handleExportPDF} className="export-btn pdf-btn">Exporter en PDF</button>
        </div>
      </div>
 
      {filteredInscriptions.length === 0 && inscriptions.length > 0 ? (
        <p>Aucune inscription ne correspond à vos critères de recherche.</p>
      ) : inscriptions.length === 0 && !isLoading ? (
        <p>Aucune inscription trouvée pour cet événement.</p>
      ) : (
        <table className="inscriptions-table">
          <thead>
            <tr>
              {/* <th>ID Inscription</th> You can choose to show this or not */}
              <th>Prénom</th>
              <th>Nom</th>
              <th>Département</th>
              <th>Soumis le</th>
              <th>Détails</th>
            </tr>
          </thead>
          <tbody>
            {/* Render filteredInscriptions instead of inscriptions */}
            {filteredInscriptions.map((inscription) => (
              <tr key={inscription.id_inscription}>
                {/* <td>{inscription.id_inscription}</td> */}
                <td>{inscription.user?.first_name || 'N/A'}</td>
                <td>{inscription.user?.last_name || 'N/A'}</td>
                <td>{inscription.user?.departement?.name_departement || 'N/A'}</td>
                <td>{new Date(inscription.created_at).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => handleOpenModal(inscription)} className="details-btn icon-btn"> {/* Added icon-btn class */}
                    <i className="fi fi-rr-eye"></i> {/* Eye icon for "Voir" */}
                    Voir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <InscriptionDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        inscription={selectedInscription}
      />
    </div>
  );
};

export default EventInscriptionsPage;
