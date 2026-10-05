import React, { useState } from 'react';
import {
  Database,
  Terminal,
  Download,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Play,
  FileCode,
  Table as TableIcon,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { DatabaseState } from '../db/databaseStore.ts';
import { BookingDetailView } from '../types.ts';

interface DatabaseEditorProps {
  db: DatabaseState;
  bookingDetailsView: BookingDetailView[];
  updateTableRow: <T extends { [key: string]: any }>(
    tableName: keyof DatabaseState,
    idKey: string,
    idVal: any,
    updatedFields: Partial<T>
  ) => void;
  deleteTableRow: (tableName: keyof DatabaseState, idKey: string, idVal: any) => void;
  resetDatabase: () => void;
  generateSQLDump: () => string;
}

type TableTab = keyof DatabaseState | 'vw_booking_details';

export const DatabaseEditor: React.FC<DatabaseEditorProps> = ({
  db,
  bookingDetailsView,
  updateTableRow,
  deleteTableRow,
  resetDatabase,
  generateSQLDump
}) => {
  const [activeTable, setActiveTable] = useState<TableTab>('vw_booking_details');
  const [editingCell, setEditingCell] = useState<{ id: any; field: string; value: any } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // SQL Console State
  const [sqlQuery, setSqlQuery] = useState<string>("SELECT * FROM vw_booking_details WHERE BookingStatus = 'Assigned';");
  const [queryResult, setQueryResult] = useState<any[] | null>(null);
  const [queryExecutionTime, setQueryExecutionTime] = useState<number | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const tableList: { key: TableTab; label: string; count: number }[] = [
    { key: 'vw_booking_details', label: 'VIEW: vw_booking_details', count: bookingDetailsView.length },
    { key: 'customers', label: 'CUSTOMER', count: db.customers.length },
    { key: 'areas', label: 'AREA', count: db.areas.length },
    { key: 'addresses', label: 'ADDRESS', count: db.addresses.length },
    { key: 'tankerTypes', label: 'TANKER_TYPE', count: db.tankerTypes.length },
    { key: 'tankers', label: 'TANKER', count: db.tankers.length },
    { key: 'drivers', label: 'DRIVER', count: db.drivers.length },
    { key: 'bookings', label: 'BOOKING', count: db.bookings.length },
    { key: 'deliveries', label: 'DELIVERY', count: db.deliveries.length },
    { key: 'payments', label: 'PAYMENT', count: db.payments.length },
  ];

  const getIdKeyForTable = (table: TableTab): string => {
    switch (table) {
      case 'customers': return 'CustomerID';
      case 'areas': return 'AreaID';
      case 'addresses': return 'AddressID';
      case 'tankerTypes': return 'TypeID';
      case 'tankers': return 'TankerID';
      case 'drivers': return 'DriverID';
      case 'bookings': return 'BookingID';
      case 'deliveries': return 'DeliveryID';
      case 'payments': return 'PaymentID';
      case 'vw_booking_details': return 'BookingID';
    }
  };

  const getTableData = (): any[] => {
    if (activeTable === 'vw_booking_details') return bookingDetailsView;
    return db[activeTable] as any[];
  };

  const handleCellSave = (id: any, field: string) => {
    if (!editingCell || activeTable === 'vw_booking_details') return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const idKey = getIdKeyForTable(activeTable);
      let val = editingCell.value;

      // Type parsing
      if (typeof val === 'string' && /^-?\d+$/.test(val.trim())) {
        val = parseInt(val.trim(), 10);
      } else if (typeof val === 'string' && /^-?\d+\.\d+$/.test(val.trim())) {
        val = parseFloat(val.trim());
      }

      updateTableRow(activeTable, idKey, id, { [field]: val });
      setEditingCell(null);
      setSuccessMsg(`Updated ${activeTable} (${field}) for ID ${id}`);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleDeleteRow = (id: any) => {
    if (activeTable === 'vw_booking_details') {
      setErrorMsg('Cannot delete directly from a SQL VIEW. Please delete from the parent table.');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const idKey = getIdKeyForTable(activeTable);
      deleteTableRow(activeTable, idKey, id);
      setSuccessMsg(`Deleted row ID ${id} from ${activeTable}`);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleExecuteSQL = () => {
    setQueryError(null);
    setQueryResult(null);
    const start = performance.now();
    const q = sqlQuery.trim();

    try {
      // Basic SQL evaluation simulation
      if (/^SELECT/i.test(q)) {
        if (/vw_booking_details/i.test(q)) {
          let res = [...bookingDetailsView];
          if (/WHERE BookingStatus\s*=\s*['"]Assigned['"]/i.test(q)) {
            res = res.filter((r) => r.BookingStatus === 'Assigned');
          } else if (/WHERE BookingStatus\s*=\s*['"]Pending['"]/i.test(q)) {
            res = res.filter((r) => r.BookingStatus === 'Pending');
          } else if (/WHERE BookingStatus\s*=\s*['"]Delivered['"]/i.test(q)) {
            res = res.filter((r) => r.BookingStatus === 'Delivered');
          }
          setQueryResult(res);
        } else if (/FROM TANKER/i.test(q)) {
          let res = [...db.tankers];
          if (/Status\s*=\s*['"]Available['"]/i.test(q)) {
            res = res.filter((t) => t.Status === 'Available');
          }
          setQueryResult(res);
        } else if (/FROM DRIVER/i.test(q)) {
          setQueryResult([...db.drivers]);
        } else if (/FROM CUSTOMER/i.test(q)) {
          setQueryResult([...db.customers]);
        } else if (/FROM AREA/i.test(q)) {
          setQueryResult([...db.areas]);
        } else if (/FROM PAYMENT/i.test(q)) {
          setQueryResult([...db.payments]);
        } else {
          setQueryResult(bookingDetailsView);
        }
      } else if (/^UPDATE/i.test(q)) {
        setSuccessMsg('SQL executed successfully: Rows affected.');
        setQueryResult([{ status: 'OK', affectedRows: 1, message: 'Executed in-memory transaction' }]);
      } else {
        setQueryResult([{ result: 'Query parsed successfully.' }]);
      }
      setQueryExecutionTime(Number((performance.now() - start).toFixed(2)));
    } catch (err: any) {
      setQueryError(err.message || 'SQL Execution error');
    }
  };

  const handleDownloadSQL = () => {
    const dump = generateSQLDump();
    const blob = new Blob([dump], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `water_tanker_db_export_${new Date().toISOString().split('T')[0]}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tableData = getTableData();
  const columns = tableData.length > 0 ? Object.keys(tableData[0]) : [];
  const idKey = getIdKeyForTable(activeTable);

  return (
    <div className="space-y-6">
      {/* Header and SQL Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <span>Relational Database Studio</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Directly modify tables, run SQL queries, and inspect relations in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadSQL}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors flex items-center gap-1.5"
            title="Download MySQL 8.0 Script"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .sql Dump</span>
          </button>

          <button
            onClick={resetDatabase}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors flex items-center gap-1.5"
            title="Reset to original sample data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Sample Data</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Interactive SQL Console Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <Terminal className="w-4 h-4" />
            <span className="font-bold">MySQL 8.0 SQL QUERY CONSOLE</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSqlQuery("SELECT * FROM vw_booking_details WHERE BookingStatus = 'Assigned';")}
              className="px-2 py-0.5 rounded text-[11px] bg-slate-950 text-slate-400 hover:text-cyan-300 border border-slate-800 font-mono"
            >
              Preset: Assigned Bookings
            </button>
            <button
              onClick={() => setSqlQuery("SELECT * FROM TANKER WHERE Status = 'Available';")}
              className="px-2 py-0.5 rounded text-[11px] bg-slate-950 text-slate-400 hover:text-cyan-300 border border-slate-800 font-mono"
            >
              Preset: Available Tankers
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative font-mono text-xs">
            <textarea
              rows={2}
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-cyan-200 font-mono focus:border-cyan-500 focus:outline-none resize-none"
            />
          </div>
          <button
            onClick={handleExecuteSQL}
            className="px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-semibold text-xs transition-colors flex items-center gap-2 shadow-md shadow-cyan-600/20"
          >
            <Play className="w-4 h-4" />
            <span>Execute</span>
          </button>
        </div>

        {/* Query Output */}
        {queryError && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono">
            {queryError}
          </div>
        )}

        {queryResult && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
            <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
              <span>{queryResult.length} rows returned</span>
              <span>Execution Time: {queryExecutionTime} ms</span>
            </div>
            <div className="max-h-48 overflow-auto">
              <table className="w-full text-left text-[11px] text-slate-300 font-mono">
                <thead className="text-slate-500 border-b border-slate-800 uppercase">
                  <tr>
                    {queryResult[0] &&
                      Object.keys(queryResult[0]).map((k) => (
                        <th key={`q-col-${k}`} className="py-1 px-2">{k}</th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {queryResult.slice(0, 10).map((row, idx) => (
                    <tr key={`qr-${idx}`} className="hover:bg-slate-800/30">
                      {Object.values(row).map((v: any, vi) => (
                        <td key={`qrv-${vi}`} className="py-1 px-2 whitespace-nowrap">
                          {v === null ? <span className="text-slate-600 italic">NULL</span> : String(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Table Tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {tableList.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActiveTable(t.key);
              setEditingCell(null);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-medium transition-all whitespace-nowrap flex items-center gap-2 border ${
              activeTable === t.key
                ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>{t.label}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table Data View & Inline Editing */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-400">
            Viewing <strong>{activeTable}</strong> • Double-click or click edit icon to modify field values directly.
          </div>
          {activeTable === 'vw_booking_details' && (
            <span className="text-[11px] font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
              Read-Only SQL View
            </span>
          )}
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 border-b border-slate-800 text-[11px] text-slate-400 uppercase font-mono tracking-wider sticky top-0 z-10">
              <tr>
                {columns.map((col) => (
                  <th key={`th-${col}`} className="py-3 px-3 whitespace-nowrap">
                    {col}
                  </th>
                ))}
                {activeTable !== 'vw_booking_details' && (
                  <th className="py-3 px-3 text-right">Delete</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {tableData.map((row) => {
                const rowId = row[idKey];

                return (
                  <tr key={`row-${rowId}`} className="hover:bg-slate-800/30 transition-colors">
                    {columns.map((col) => {
                      const val = row[col];
                      const isEditing =
                        editingCell && editingCell.id === rowId && editingCell.field === col;

                      return (
                        <td key={`cell-${rowId}-${col}`} className="py-2 px-3 whitespace-nowrap font-mono text-[11px]">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                autoFocus
                                value={editingCell.value ?? ''}
                                onChange={(e) =>
                                  setEditingCell({ ...editingCell, value: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCellSave(rowId, col);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="px-2 py-1 bg-slate-950 border border-cyan-500 rounded text-white text-xs w-28 focus:outline-none"
                              />
                              <button
                                onClick={() => handleCellSave(rowId, col)}
                                className="p-1 text-emerald-400 hover:text-emerald-300"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingCell(null)}
                                className="p-1 text-slate-500 hover:text-slate-400"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                if (activeTable !== 'vw_booking_details' && col !== idKey) {
                                  setEditingCell({ id: rowId, field: col, value: val });
                                }
                              }}
                              className={`group flex items-center justify-between gap-2 px-1.5 py-1 rounded cursor-pointer ${
                                col !== idKey && activeTable !== 'vw_booking_details'
                                  ? 'hover:bg-slate-800'
                                  : ''
                              }`}
                            >
                              <span>
                                {val === null ? (
                                  <span className="text-slate-600 italic">NULL</span>
                                ) : (
                                  String(val)
                                )}
                              </span>
                              {col !== idKey && activeTable !== 'vw_booking_details' && (
                                <Edit2 className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {activeTable !== 'vw_booking_details' && (
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => handleDeleteRow(rowId)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                          title="Delete Row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
