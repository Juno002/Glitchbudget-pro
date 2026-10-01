export function shouldApplyAutomaticRuleField(
  manuallyEdited: boolean,
  suggestedValue: unknown,
): boolean {
  return !manuallyEdited
    && suggestedValue !== undefined
    && suggestedValue !== null
    && suggestedValue !== '';
}
