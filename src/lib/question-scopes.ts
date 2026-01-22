// Mapping of specific QA keys to the subset of animals they are valid for.
// Extend this as new constraints are added from the CSV or other config sources.
export const QUESTION_ANIMAL_SCOPE: Record<string, string[]> = {
  // Livestock (animal husbandry) examples – adjust as per domain rules
  "qa.livestock.health.mastitis_treatment": ["cow", "buffalo", "goat", "sheep"],
  "qa.livestock.milk.increase_production": ["cow", "buffalo", "goat", "sheep"],
  "qa.livestock.vaccines.schedule_year": ["cow", "buffalo", "goat", "sheep", "chicken"],
  "qa.livestock.feed.silage_prep": ["cow", "buffalo", "goat", "sheep"],
  "qa.livestock.feed.ration_balancing": ["cow", "buffalo", "goat", "sheep"],
  "qa.livestock.health.common_diseases_prevention": ["cow", "buffalo", "goat", "sheep", "chicken"],
  "qa.livestock.care.newborn_calves": ["cow", "buffalo"],
  "qa.livestock.health.lsd_protection": ["cow", "buffalo"],
  "qa.livestock.health.bloat_treatment": ["cow", "buffalo", "goat", "sheep"],
  "qa.livestock.health.parasite_signs": ["cow", "buffalo", "goat", "sheep", "chicken"],
  "qa.livestock.environment.methane_reduce": ["cow", "buffalo", "goat", "sheep"],
  "qa.livestock.breeding.artificial_insemination": ["cow", "buffalo", "goat", "sheep"],
  "qa.livestock.biosecurity.measures": ["cow", "buffalo", "goat", "sheep", "chicken"],
  "qa.livestock.health.health_calendar_importance": ["cow", "buffalo", "goat", "sheep", "chicken"]
};

/**
 * Filters variable arrays based on scope rules (currently only animal scoping).
 * If a QA key has a defined animal scope and the variable name is one of the animal variable placeholders,
 * we restrict the values to that scope. If the scoped list becomes empty (e.g., mismatch), we fall back
 * to the original full list to avoid runtime errors.
 */
export function filterVariableValues(
  qaKey: string,
  variableName: string,
  values: string[]
): string[] {
  if (variableName === "animal" && QUESTION_ANIMAL_SCOPE[qaKey]) {
    const allowed = QUESTION_ANIMAL_SCOPE[qaKey];
    const filtered = values.filter(v => allowed.includes(v));
    return filtered.length > 0 ? filtered : values; // graceful fallback
  }
  return values;
}
