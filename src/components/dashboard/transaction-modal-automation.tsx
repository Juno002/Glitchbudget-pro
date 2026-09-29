'use client';

import { BookmarkPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NECESSITY_LABELS } from '@/domain/transaction-metadata';
import type { RuleMatch } from '@/domain/rule-engine';
import type { QuickAddTemplate } from '@/lib/quick-add-templates';

export function QuickAddTemplateSelector({
  templates,
  selectedTemplateId,
  onSelect,
  onDelete,
}: {
  templates: QuickAddTemplate[];
  selectedTemplateId: string;
  onSelect: (id: string) => void;
  onDelete: () => void;
}) {
  if (templates.length === 0) return null;

  return (
    <div className="border-b px-6 py-3">
      <div className="flex items-center gap-2">
        <label htmlFor="quick-add-template" className="sr-only">Usar plantilla</label>
        <select
          id="quick-add-template"
          value={selectedTemplateId}
          onChange={event => onSelect(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Usar plantilla…</option>
          {templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
        </select>
        <Button type="button" variant="ghost" size="sm" disabled={!selectedTemplateId} onClick={onDelete}>
          Eliminar
        </Button>
      </div>
    </div>
  );
}

export function TransactionRuleSuggestions({
  automaticRuleId,
  automaticRuleSuggestion,
  hasAutomaticConflict,
  ruleSuggestions,
  categoryName,
  onAccept,
  onDismiss,
}: {
  automaticRuleId: string | null;
  automaticRuleSuggestion?: RuleMatch | null;
  hasAutomaticConflict: boolean;
  ruleSuggestions: RuleMatch[];
  categoryName: (id: string) => string;
  onAccept: (match: RuleMatch) => void;
  onDismiss: (ruleId: string) => void;
}) {
  return (
    <>
      {automaticRuleId && automaticRuleSuggestion && (
        <div className="rounded-lg border bg-muted/20 p-3 text-xs" aria-label="Regla aplicada automáticamente">
          <p className="font-medium">Aplicado automáticamente · {automaticRuleSuggestion.ruleName}</p>
          <p className="mt-1 text-muted-foreground">
            Solo rellenó la clasificación de Quick Add. Puedes cambiar estos campos antes de guardar.
          </p>
        </div>
      )}

      {hasAutomaticConflict && (
        <div className="rounded-lg border bg-muted/20 p-3 text-xs" role="status">
          <p className="font-medium">Varias reglas automáticas coinciden</p>
          <p className="mt-1 text-muted-foreground">
            No se aplicó ninguna automáticamente. Elige una sugerencia manualmente.
          </p>
        </div>
      )}

      {ruleSuggestions.length > 0 && (
        <div className="space-y-2 rounded-lg border bg-muted/20 p-3" aria-label="Sugerencias de reglas">
          <div>
            <p className="text-sm font-medium">Sugerencias de reglas</p>
            <p className="text-xs text-muted-foreground">Nada cambia hasta que aceptes una sugerencia.</p>
          </div>
          {ruleSuggestions.map(match => {
            const suggestedCategory = match.suggestion.categoryId
              ? categoryName(match.suggestion.categoryId)
              : null;
            const suggestedNecessity = match.suggestion.necessity
              ? NECESSITY_LABELS[match.suggestion.necessity]
              : null;
            return (
              <div key={match.ruleId} className="rounded-md border bg-background p-3">
                <p className="text-xs font-medium">{match.ruleName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[suggestedCategory && `Categoría: ${suggestedCategory}`, suggestedNecessity && `Necesidad: ${suggestedNecessity}`].filter(Boolean).join(' · ')}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" aria-label={`Aceptar sugerencia ${match.ruleName}`} onClick={() => onAccept(match)}>
                    Aceptar sugerencia
                  </Button>
                  <Button type="button" size="sm" variant="ghost" aria-label={`Ignorar sugerencia ${match.ruleName}`} onClick={() => onDismiss(match.ruleId)}>
                    Ignorar sugerencia
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export function QuickAddTemplateSave({
  templateName,
  templateReady,
  onNameChange,
  onSave,
}: {
  templateName: string;
  templateReady: boolean;
  onNameChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-2 border-t pt-4">
      <span className="text-sm font-medium">Plantilla</span>
      <p className="text-xs text-muted-foreground">Guarda estos valores para reutilizarlos. La fecha siempre se restablece al día en que uses la plantilla.</p>
      <div className="flex gap-2">
        <Input
          aria-label="Nombre de plantilla"
          placeholder="Ej. Bus"
          value={templateName}
          onChange={event => onNameChange(event.target.value)}
          maxLength={80}
        />
        <Button type="button" variant="outline" disabled={!templateReady || !templateName.trim()} onClick={onSave}>
          <BookmarkPlus className="mr-2 h-4 w-4" />
          Guardar como plantilla
        </Button>
      </div>
    </div>
  );
}
