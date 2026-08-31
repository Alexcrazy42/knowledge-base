// ============================================================================
// DialogHost - единственное место, где диалоги реально монтируются в DOM.
// Монтируется один раз в app/App.tsx. Слои ниже app про хост не знают -
// они зовут prompt()/confirm()/ask() из shared/ui/dialog.
// ============================================================================

import { useSyncExternalStore } from 'react';
import { dialogService } from './dialog-service';

export function DialogHost() {
    const entries = useSyncExternalStore(dialogService.subscribe, dialogService.getEntries);
    return (
        <>
            {entries.map(entry => (
                <div key={entry.id} style={{ display: 'contents' }}>{entry.content}</div>
            ))}
        </>
    );
}
