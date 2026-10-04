export type ReportCategoryVisualizationInput = {
  key: string;
  label: string;
  value: number;
};

export type ReportCategoryVisualizationSegment = ReportCategoryVisualizationInput & {
  isOther: boolean;
  sourceKeys: string[];
  share: number;
  percentTenths: number;
};

export type ReportCategoryVisualization = {
  total: number;
  segments: ReportCategoryVisualizationSegment[];
};

type IndexedCategory = ReportCategoryVisualizationInput & {
  canonicalIndex: number;
};

function roundPercentTenths(
  rows: Array<ReportCategoryVisualizationInput & { isOther: boolean; sourceKeys: string[] }>,
  total: number,
) {
  const allocations = rows.map((row, index) => {
    const scaled = row.value * 1000;
    const floor = Math.floor(scaled / total);
    return {
      index,
      floor,
      remainder: scaled - floor * total,
    };
  });

  let remaining = 1000 - allocations.reduce((sum, row) => sum + row.floor, 0);
  const order = [...allocations].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let index = 0; index < remaining; index += 1) {
    allocations[order[index % order.length].index].floor += 1;
  }

  return allocations.map(row => row.floor);
}

/**
 * Pure presentation projection for the Reports category donut.
 * Canonical rows stay untouched; zero/non-positive rows do not become segments.
 */
export function projectReportCategoryDistribution(
  rows: readonly ReportCategoryVisualizationInput[],
  maxVisible = 4,
): ReportCategoryVisualization {
  if (!Number.isInteger(maxVisible) || maxVisible <= 0) {
    throw new Error('El máximo de categorías visibles debe ser un entero positivo.');
  }

  const positive: IndexedCategory[] = rows
    .map((row, canonicalIndex) => ({ ...row, canonicalIndex }))
    .filter(row => row.value > 0)
    .sort((a, b) => b.value - a.value || a.canonicalIndex - b.canonicalIndex);

  if (!positive.length) return { total: 0, segments: [] };

  const leading = positive.slice(0, maxVisible);
  const remainder = positive.slice(maxVisible);
  const projected: Array<ReportCategoryVisualizationInput & { isOther: boolean; sourceKeys: string[] }> =
    leading.map(row => ({
      key: row.key,
      label: row.label,
      value: row.value,
      isOther: false,
      sourceKeys: [row.key],
    }));

  if (remainder.length) {
    projected.push({
      key: '__report_other__',
      label: 'Otros',
      value: remainder.reduce((sum, row) => sum + row.value, 0),
      isOther: true,
      sourceKeys: remainder.map(row => row.key),
    });
  }

  const total = projected.reduce((sum, row) => sum + row.value, 0);
  const roundedTenths = roundPercentTenths(projected, total);

  return {
    total,
    segments: projected.map((row, index) => ({
      ...row,
      share: row.value / total,
      percentTenths: roundedTenths[index],
    })),
  };
}
