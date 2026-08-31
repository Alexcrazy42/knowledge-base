// ============================================================================
// FilterBar - панель фильтров. Контролируемый компонент: значения приходят
// в props, изменения уходят через onChange - источник истины один (страница).
// Подписи и порядок контролов совпадают с Vue-версией (важно для e2e).
// ============================================================================

import type { TaskFilterCriteria } from '@/entities/task';
import { defaultFilterCriteria } from '@/entities/task';

export interface FilterOption {
    id: string | null;           // null = "(все)", FILTER_NONE = "Без ..."
    label: string;
}

interface FilterBarProps {
    criteria: TaskFilterCriteria;
    onChange: (next: TaskFilterCriteria) => void;
    assigneeOptions: FilterOption[];
    epicOptions: FilterOption[];
}

export function FilterBar({ criteria, onChange, assigneeOptions, epicOptions }: FilterBarProps) {
    const patch = (part: Partial<TaskFilterCriteria>) => onChange({ ...criteria, ...part });

    return (
        <div className="filter-bar">
            {/* v-model из Vue превращается в value+onChange - контролируемый input */}
            <input
                className="input search"
                placeholder="Поиск по заголовку и описанию"
                value={criteria.search}
                onChange={e => patch({ search: e.target.value })}
            />
            <select className="input" value={criteria.assigneeId ?? ''}
                    onChange={e => patch({ assigneeId: optionValue(e.target.value) })}>
                {assigneeOptions.map(o => (
                    <option key={optionKey(o.id)} value={optionKey(o.id)}>{o.label}</option>
                ))}
            </select>
            <select className="input" value={criteria.epicId ?? ''}
                    onChange={e => patch({ epicId: optionValue(e.target.value) })}>
                {epicOptions.map(o => (
                    <option key={optionKey(o.id)} value={optionKey(o.id)}>{o.label}</option>
                ))}
            </select>
            <label className="checkbox">
                <input
                    type="checkbox"
                    checked={criteria.highFirst}
                    onChange={e => patch({ highFirst: e.target.checked })}
                />
                {' '}Сначала High
            </label>
            <button className="btn" onClick={() => onChange(defaultFilterCriteria)}>Сбросить фильтры</button>
        </div>
    );
}

// null/спецзначения не кладут в DOM напрямую - кодируем строками атрибута value.
function optionKey(id: string | null): string {
    return id ?? '';
}

function optionValue(raw: string): string | null {
    return raw === '' ? null : raw;
}
