export const VALID_SPECIALTIES = [
  "Cardiology",
  "Neurology",
  "Orthopedic",
  "Dermatology",
  "Psychiatry",
  "Oncology",
  "Ophthalmology",
  "Gynecology",
  "Pediatrics",
  "Radiology",
  "Gastroenterology",
  "Urology",
  "Endocrinology",
];

export const SPECIALTY_ALIASES = {
  Cardiologist: "Cardiology",
  Neurologist: "Neurology",
  Orthopedist: "Orthopedic",
  Dermatologist: "Dermatology",
  Psychiatrist: "Psychiatry",
  Oncologist: "Oncology",
  Ophthalmologist: "Ophthalmology",
  Gynecologist: "Gynecology",
  Pediatrician: "Pediatrics",
  Radiologist: "Radiology",
  Gastroenterologist: "Gastroenterology",
  Urologist: "Urology",
  Endocrinologist: "Endocrinology",
};

export const normalizeSpecialty = (input) => {
  if (!input) return null;

  const decoded = decodeURIComponent(input).trim();

  const directMatch = VALID_SPECIALTIES.find(
    (specialty) => specialty.toLowerCase() === decoded.toLowerCase()
  );
  if (directMatch) return directMatch;

  const aliasMatch = Object.entries(SPECIALTY_ALIASES).find(
    ([alias]) => alias.toLowerCase() === decoded.toLowerCase()
  );
  return aliasMatch ? aliasMatch[1] : null;
};

export const getSpecialtySearchValues = (specialty) => {
  const values = new Set([specialty]);

  for (const [alias, canonical] of Object.entries(SPECIALTY_ALIASES)) {
    if (canonical === specialty) {
      values.add(alias);
    }
  }

  return [...values];
};
