export interface Empresa {
  id: number;
  razonSocial: string;
  ruc: string;
  contactoNombre: string;
  contactoEmail: string;
  contactoTelefono: string;
  sector: string;
  fechaRegistro: string; // formato ISO: "2025-01-15"
  anunciosActivos: number;
}