import data from "../../content/anniversary-catalog.json";
import type { AnniversaryCatalog } from "../domain/types";
export const bundledAnniversaries: AnniversaryCatalog = data;
export function milestoneFor(catalog: AnniversaryCatalog, year: number) {
  return (
    catalog.milestones.find((m) => m.year === year) ?? {
      year,
      material: year === 0 ? "El comienzo" : `${year} años juntos`,
      meaning:
        year === 0
          ? "Su historia acaba de comenzar. Antes de cumplir el primer año, cada día es una oportunidad para conocerse y construir acuerdos."
          : "Este año no tiene un nombre en el catálogo seleccionado. Su valor está en lo vivido y en la manera en que decidan seguir cuidándose.",
      invitation:
        "Regálense una conversación sobre lo que desean para esta etapa.",
    }
  );
}
export function milestoneTitle(material: string, year: number) {
  return year === 0 || material === `${year} años juntos`
    ? material
    : `Bodas de ${material.toLocaleLowerCase("es")}`;
}
