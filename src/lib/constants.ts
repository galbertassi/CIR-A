export const PUBLIC_HOSPITALS = [
  "Hospital São João Batista (HSJB)",
  "Hospital Munir Raffur (HMMR)",
  "Hospital Doutor Nelson Gonçalves (HNSG)",
];

export const PRIVATE_HOSPITALS = [
  "Hospital H.FOA",
  "Hospital Santa Cecília (HSC)",
  "Hospital Viver Mais",
];

export const ALL_HOSPITALS = [...PUBLIC_HOSPITALS, ...PRIVATE_HOSPITALS, "Hospitais Privados (Geral)"];

export const SEVERITY_LEVELS = [
  { value: "CLINICA_MEDICA", label: "Clinica Médica (Azul)", score: 0 },
  { value: "CTI", label: "CTI (Laranja)", score: 20 },
  { value: "SALA_VERMELHA", label: "CTI/Sala Vermelha (Vermelha)", score: 0 }, // Vaga Zero
];

export const HOSPITAL_CONTACTS: Record<string, { phone: string, email: string }> = {
  "Hospital São João Batista (HSJB)": { phone: "5524999755006", email: "nir2.hsjb@hsjb.org.br" },
  "Hospital Munir Raffur (HMMR)": { phone: "5524993068957", email: "transferenciasnirhmmr@gmail.com" },
  "Hospital H.FOA": { phone: "5524999999994", email: "centraldevagas@hfoa.org.br" },
  "Hospital Santa Cecília (HSC)": { phone: "5524999999995", email: "regulacaosus@hospitalsantacecilia.org.br" },
  "Hospital Viver Mais": { phone: "5524999999996", email: "internacao@vivermaishospital.com.br" },
  "Hospital Doutor Nelson Gonçalves (HNSG)": { phone: "5524999999997", email: "transferenciasnirhnsg@gmail.com" },
};

export const REGULACAO_WHATSAPP = "552435128145";
